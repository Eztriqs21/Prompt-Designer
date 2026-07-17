import { Router } from 'express';
import { requireWorkspaceAuth, type AuthenticatedRequest } from '../middleware/authWorkspaceKey.js';
import * as runStore from '../db/runStore.js';
import { nextStage, canTransition } from '../lib/workflow/stateMachine.js';
import { buildBuildPrompt } from '../lib/workflow/buildPrompt.js';
import { buildAuditPrompt } from '../lib/workflow/auditPrompt.js';
import { buildFinalSummaryPrompt } from '../lib/workflow/finalSummaryPrompt.js';
import { auditAgentResponse } from '../lib/workflow/auditEngine.js';
import { decideNextAction } from '../lib/workflow/continueDecider.js';
import { generateSummary } from '../lib/workflow/summaryGenerator.js';
import type { SubmitResultPayload, AgentResponse } from '../../src/types/vibeloop.js';

const router = Router();

// Get next task for agent
router.get('/agent/next-task', requireWorkspaceAuth, (req: AuthenticatedRequest, res) => {
  const workspace = req.workspace;
  const activeRun = runStore.getActiveRun(workspace.id);

  if (!activeRun) {
    res.status(404).json({ error: 'No active run found' });
    return;
  }

  // Check if there's a prompt ready
  if (!activeRun.latestPrompt) {
    res.status(204).end();
    return;
  }

  res.json({
    runId: activeRun.id,
    workspaceId: workspace.id,
    stage: activeRun.stage,
    iteration: activeRun.iteration,
    prompt: activeRun.latestPrompt,
    plan: activeRun.plan,
  });
});

// Submit agent result
router.post('/agent/result', requireWorkspaceAuth, (req: AuthenticatedRequest, res) => {
  const workspace = req.workspace;
  const payload = req.body as SubmitResultPayload;

  if (!payload.message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const activeRun = runStore.getActiveRun(workspace.id);
  if (!activeRun) {
    res.status(404).json({ error: 'No active run found' });
    return;
  }

  // Convert payload to AgentResponse
  const response: AgentResponse = {
    message: payload.message,
    diffSummary: payload.diffSummary,
    filesTouched: payload.filesTouched,
    commandsRun: payload.commandsRun,
    testResults: payload.testResults,
    errorsFound: payload.errorsFound,
    suggestedFixes: payload.suggestedFixes,
    done: payload.done,
    compacted: payload.compacted,
  };

  // Store the response
  runStore.setRunLatestResponse(activeRun.id, response);

  // Add event
  runStore.addRunEvent(activeRun.id, {
    stage: activeRun.stage,
    type: 'result_received',
    data: { done: payload.done, compacted: payload.compacted },
  });

  // Handle completion signals
  if (payload.done && !payload.compacted) {
    // Agent claims done and no compaction - move to audit
    if (canTransition(activeRun.stage, 'agent_done_signal')) {
      runStore.transitionRunStage(activeRun.id, 'maybe_done', {
        trigger: 'agent_done_signal',
        done: true,
      });
    }
  } else if (payload.compacted) {
    // Context exhaustion
    if (canTransition(activeRun.stage, 'compaction_detected')) {
      runStore.transitionRunStage(activeRun.id, 'context_compacted', {
        trigger: 'compaction_detected',
      });
    }
  }

  // Clear the prompt so agent doesn't get it again
  runStore.setRunLatestPrompt(activeRun.id, '');

  res.json({ status: 'received', stage: runStore.getRun(activeRun.id)?.stage });
});

// Check agent status (optional endpoint)
router.get('/agent/status', requireWorkspaceAuth, (req: AuthenticatedRequest, res) => {
  const workspace = req.workspace;
  const activeRun = runStore.getActiveRun(workspace.id);

  if (!activeRun) {
    res.json({ active: false });
    return;
  }

  res.json({
    active: true,
    runId: activeRun.id,
    stage: activeRun.stage,
    iteration: activeRun.iteration,
  });
});

// Trigger audit
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

  const workspace = (await import('../db/workspaceStore.js')).getWorkspace(run.workspaceId);
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
    if (canTransition(run.stage, decision.nextStage === 'complete' ? 'all_clear' : decision.nextStage === 'needs_fix' ? 'fix_required' : 'more_work_needed')) {
      const trigger = decision.nextStage === 'complete' ? 'all_clear' :
                      decision.nextStage === 'needs_fix' ? 'fix_required' :
                      decision.nextStage === 'partial_complete' ? 'partial_done' : 'more_work_needed';
      runStore.transitionRunStage(run.id, decision.nextStage as any, { trigger });
    }

    // If continuing, generate next prompt
    if (decision.shouldContinue) {
      const nextPrompt = decision.nextStage === 'needs_fix'
        ? buildFixPrompt(workspace, run, audit)
        : buildBuildPrompt(workspace, run, run.plan || '');

      runStore.setRunLatestPrompt(run.id, nextPrompt);
      runStore.incrementRunIteration(run.id);
    } else {
      // Complete the run
      const summary = generateSummary(run, workspace, audit, [audit]);
      runStore.completeRun(run.id, decision.nextStage as any);

      // Store summary
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

// Get run summary
router.get('/runs/:runId/summary', (req, res) => {
  const run = runStore.getRun(req.params.runId);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  const workspace = (require('../db/workspaceStore.js') as any).getWorkspace(run.workspaceId);
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  const summary = generateSummary(run, workspace, run.latestAudit || null, []);
  res.json(summary);
});

function buildFixPrompt(workspace: any, run: any, audit: any): string {
  const issues = audit.issues
    .filter((i: any) => i.severity === 'critical' || i.severity === 'major')
    .map((i: any) => `- ${i.severity}: ${i.description}\n  Suggestion: ${i.suggestion}`)
    .join('\n');

  return `# VibeLoop Fix Mode

You are in **Fix Mode**. The audit found issues that need to be fixed.

## Project: ${workspace.projectName}

### Issues to Fix
${issues}

### Current Iteration: ${run.iteration}

## Instructions

1. Fix each issue listed above
2. Ensure the fixes don't introduce new problems
3. Output DONE when all fixes are complete

## Response Format

### Fixes Applied
- [List of fixes made]

### Files Modified
- [List of files changed]

### Status
- DONE (when all fixes are complete)`;
}

export default router;
