import { Router } from 'express';
import * as runStore from '../db/runStore.js';
import * as workspaceStore from '../db/workspaceStore.js';
import { auditAgentResponse } from '../lib/vibeloopAudit.js';
import { decideNextAction } from '../lib/continueDecider.js';
import { canTransition, nextStage } from '../lib/stateMachine.js';
import { buildFixPrompt } from '../lib/promptBuilder.js';
import { generateSummary } from '../lib/summaryGenerator.js';

const router = Router();

// POST /api/vibeloop/audit — Trigger audit for a run (called internally or by watchdog)
router.post('/vibeloop/audit', async (req, res) => {
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

  if (run.stage !== 'auditing') {
    res.status(400).json({ error: `Run is not in auditing stage (current: ${run.stage})` });
    return;
  }

  const workspace = workspaceStore.getWorkspace(run.workspaceId);
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  try {
    // Run audit
    const audit = await auditAgentResponse(run.latestResponse!, workspace, run);

    // Update run with audit result
    runStore.updateRun(run.id, { latestAudit: audit });

    runStore.addRunEvent(run.id, {
      stage: 'auditing',
      type: 'audit_complete',
      data: {
        status: audit.status,
        issueCount: audit.issues.length,
        summary: audit.summary,
      },
    });

    // Decide next action
    const decision = decideNextAction(audit, run, workspace);

    if (decision.shouldContinue && decision.nextStage === 'needs_fix') {
      // Generate fix prompt and continue
      const fixPrompt = buildFixPrompt(workspace, run, audit.issues);
      runStore.updateRun(run.id, {
        latestPrompt: fixPrompt,
        unresolvedIssues: audit.issues.filter((i) => i.fixable),
      });

      runStore.addRunEvent(run.id, {
        stage: 'needs_fix',
        type: 'fix_generated',
        data: { issueCount: audit.issues.filter((i) => i.fixable).length },
      });

      // Transition through needs_fix -> generating_fix_prompt -> agent_executing
      if (canTransition('auditing', 'has_fixable_issues')) {
        runStore.transitionRunStage(run.id, nextStage('auditing', 'has_fixable_issues'), 'has_fixable_issues');
      }
      if (canTransition(run.stage, 'fix_needed')) {
        runStore.transitionRunStage(run.id, nextStage(run.stage, 'fix_needed'), 'fix_needed');
      }
      if (canTransition(run.stage, 'prompt_sent')) {
        runStore.transitionRunStage(run.id, nextStage(run.stage, 'prompt_sent'), 'prompt_sent');
      }

      res.json({ status: 'continue', audit, nextStage: 'agent_executing' });
    } else if (decision.shouldContinue && decision.nextStage === 'final_summary') {
      // Generate final summary
      const summary = generateSummary(workspace, run);

      if (canTransition('auditing', 'no_more_progress')) {
        runStore.transitionRunStage(run.id, nextStage('auditing', 'no_more_progress'), 'no_more_progress');
      }
      if (canTransition(run.stage, 'summary_generated')) {
        runStore.transitionRunStage(run.id, nextStage(run.stage, 'summary_generated'), 'summary_generated');
      }

      runStore.updateRun(run.id, { status: 'completed', endedAt: new Date().toISOString() });
      workspaceStore.updateWorkspace(workspace.id, { status: 'ready' });

      res.json({ status: 'complete', audit, summary });
    } else {
      // All done
      if (canTransition('auditing', 'all_done')) {
        runStore.transitionRunStage(run.id, nextStage('auditing', 'all_done'), 'all_done');
      }

      const summary = generateSummary(workspace, run);
      runStore.updateRun(run.id, { status: 'completed', endedAt: new Date().toISOString() });
      workspaceStore.updateWorkspace(workspace.id, { status: 'ready' });

      res.json({ status: 'complete', audit, summary });
    }
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

export default router;
