import { Router } from 'express';
import * as runStore from '../db/runStore.js';
import * as workspaceStore from '../db/workspaceStore.js';
import { canTransition } from '../lib/workflow/stateMachine.js';
import { buildBuildPrompt } from '../lib/workflow/buildPrompt.js';
import { auditAgentResponse } from '../lib/workflow/auditEngine.js';
import { decideNextAction } from '../lib/workflow/continueDecider.js';
import { generateSummary } from '../lib/workflow/summaryGenerator.js';
import {
  writePromptFile,
  readPromptFile,
  updatePromptStatus,
  readResponseFile,
  clearResponseFile,
  writeConfigFile,
  readConfigFile,
  type BridgePrompt,
  type BridgeConfig,
} from '../lib/workflow/bridgeManager.js';
import type { AgentResponse } from '../../src/types/vibeloop.js';

const router = Router();

// ─── Bridge Config ─────────────────────────────────────────

// Get bridge config
router.get('/bridge/config', (_req, res) => {
  const config = readConfigFile();
  res.json(config || { calibrated: false });
});

// Update bridge config (used by calibration script)
router.post('/bridge/config', (req, res) => {
  const config: BridgeConfig = req.body;
  writeConfigFile(config);
  res.json({ status: 'ok' });
});

// ─── Bridge Prompt/Response ────────────────────────────────

// Get current prompt status (for polling)
router.get('/bridge/status', (_req, res) => {
  const prompt = readPromptFile();
  const response = readResponseFile();
  res.json({
    prompt: prompt ? { id: prompt.id, status: prompt.status, mode: prompt.mode } : null,
    response: response ? { promptId: response.promptId, done: response.done } : null,
  });
});

// Get full prompt data (for Python to fetch the prompt text)
router.get('/bridge/prompt', (_req, res) => {
  const prompt = readPromptFile();
  if (!prompt || prompt.status !== 'pending' || !prompt.prompt) {
    res.status(204).end();
    return;
  }
  res.json(prompt);
});

// Write a new prompt to the bridge (called by website when starting a run)
router.post('/bridge/prompt', (req, res) => {
  const { mode, prompt, chatName, runId, workspaceId } = req.body;

  if (!mode || !prompt || !chatName) {
    res.status(400).json({ error: 'mode, prompt, and chatName are required' });
    return;
  }

  const bridgePrompt = writePromptFile(mode, prompt, chatName);

  // Also update the run's latestPrompt
  if (runId) {
    runStore.setRunLatestPrompt(runId, prompt);
    runStore.addRunEvent(runId, {
      stage: 'building',
      type: 'prompt_sent',
      data: { mode, bridgePromptId: bridgePrompt.id },
    });
  }

  res.json(bridgePrompt);
});

// Read the response from the bridge (called by website to check for results)
router.get('/bridge/response', (_req, res) => {
  const response = readResponseFile();
  if (!response || !response.response) {
    res.status(204).end();
    return;
  }
  res.json(response);
});

// Clear the response file (called after processing)
router.delete('/bridge/response', (_req, res) => {
  clearResponseFile();
  res.json({ status: 'cleared' });
});

// ─── Agent Result Submission (via bridge) ───────────────────

// Submit agent result (called by Python after OpenCode finishes)
router.post('/agent/result', (req, res) => {
  const { promptId, message, done, compacted, filesTouched, errorsFound } = req.body;

  if (!promptId || !message) {
    res.status(400).json({ error: 'promptId and message are required' });
    return;
  }

  const prompt = readPromptFile();
  if (!prompt || prompt.id !== promptId) {
    res.status(404).json({ error: 'Prompt not found or already processed' });
    return;
  }

  // Find the active run
  const runs = runStore.getRunsForWorkspace(prompt.workspaceId);
  const activeRun = runs.find((r) => r.status === 'running');
  if (!activeRun) {
    res.status(404).json({ error: 'No active run found' });
    return;
  }

  // Convert to AgentResponse
  const response: AgentResponse = {
    message,
    filesTouched,
    errorsFound,
    done,
    compacted,
  };

  // Store the response
  runStore.setRunLatestResponse(activeRun.id, response);

  // Add event
  runStore.addRunEvent(activeRun.id, {
    stage: activeRun.stage,
    type: 'result_received',
    data: { done, compacted, promptId },
  });

  // Handle completion signals
  if (done && !compacted) {
    if (canTransition(activeRun.stage, 'agent_done_signal')) {
      runStore.transitionRunStage(activeRun.id, 'maybe_done', {
        trigger: 'agent_done_signal',
        done: true,
      });
    }
  } else if (compacted) {
    if (canTransition(activeRun.stage, 'compaction_detected')) {
      runStore.transitionRunStage(activeRun.id, 'context_compacted', {
        trigger: 'compaction_detected',
      });
    }
  }

  // Update prompt status
  updatePromptStatus(promptId, 'completed');

  // Clear the response file
  clearResponseFile();

  res.json({ status: 'received', stage: runStore.getRun(activeRun.id)?.stage });
});

// ─── Audit (triggered after result submission) ──────────────

router.post('/audit', (req, res) => {
  const { runId } = req.body as { runId: string };

  if (!runId) {
    res.status(400).json({ error: 'runId is required' });
    return;
  }

  const run = runStore.getRun(runId);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  const workspace = workspaceStore.getWorkspace(run.workspaceId);
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  if (!run.latestResponse) {
    res.status(400).json({ error: 'No agent response to audit' });
    return;
  }

  try {
    // Move to auditing stage
    runStore.transitionRunStage(run.id, 'auditing', { trigger: 'audit_start' });

    // Run audit
    const audit = auditAgentResponse(
      {
        agentMessage: run.latestResponse.message,
        filesTouched: run.latestResponse.filesTouched,
        errorsFound: run.latestResponse.errorsFound,
        testResults: run.latestResponse.testResults,
        done: run.latestResponse.done,
        compacted: run.latestResponse.compacted,
      },
      workspace,
      run
    );

    // Store audit result
    runStore.setRunLatestAudit(run.id, audit);

    // Decide next action
    const decision = decideNextAction(audit, run, workspace);

    // Transition to next stage
    const triggerMap: Record<string, string> = {
      complete: 'all_clear',
      needs_fix: 'fix_required',
      partial_complete: 'partial_done',
      continuing: 'more_work_needed',
    };
    const trigger = triggerMap[decision.nextStage] || 'more_work_needed';

    if (canTransition(run.stage, trigger)) {
      runStore.transitionRunStage(run.id, decision.nextStage as any, { trigger });
    }

    // If continuing, generate next prompt and write to bridge
    if (decision.shouldContinue) {
      const { buildFixPrompt } = require('../lib/workflow/buildPrompt.js');
      const nextPrompt = decision.nextStage === 'needs_fix'
        ? buildFixPrompt(workspace, run, audit)
        : buildBuildPrompt(workspace, run, run.plan || '');

      runStore.setRunLatestPrompt(run.id, nextPrompt);
      runStore.incrementRunIteration(run.id);

      // Write to bridge
      const config = readConfigFile();
      const chatName = config?.chatName || workspace.projectName;
      writePromptFile('build', nextPrompt, chatName);
    } else {
      // Complete the run
      const summary = generateSummary(run, workspace, audit, [audit]);
      runStore.completeRun(run.id, decision.nextStage as any);

      runStore.addRunEvent(run.id, {
        stage: decision.nextStage as any,
        type: 'info',
        data: { summary },
      });
    }

    res.json({ status: 'audit_complete', audit, nextStage: decision.nextStage });
  } catch (err: any) {
    console.error('Audit failed:', err);
    runStore.addRunEvent(run.id, {
      stage: 'auditing',
      type: 'error',
      data: { error: err.message },
    });
    res.status(500).json({ error: 'Audit failed', details: err.message });
  }
});

// ─── Run Summary ───────────────────────────────────────────

router.get('/runs/:runId/summary', (req, res) => {
  const run = runStore.getRun(req.params.runId);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  const workspace = workspaceStore.getWorkspace(run.workspaceId);
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  const summary = generateSummary(run, workspace, run.latestAudit || null, []);
  res.json(summary);
});

export default router;
