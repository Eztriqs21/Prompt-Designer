import { Router } from 'express';
import * as workspaceStore from '../db/workspaceStore.js';
import * as runStore from '../db/runStore.js';
import { canTransition, nextStage } from '../lib/stateMachine.js';
import type { SubmitResultPayload, AgentResponse } from '../../src/types/vibeloop.js';

const router = Router();

// Auth middleware — validates Bearer token against workspace key
function requireWorkspaceAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const key = authHeader.slice(7);
  const workspace = workspaceStore.getWorkspaceByKey(key);

  if (!workspace) {
    res.status(401).json({ error: 'Invalid workspace key' });
    return;
  }

  if (workspace.revokedAt) {
    res.status(403).json({ error: 'Workspace key has been revoked' });
    return;
  }

  req.workspace = workspace;
  next();
}

// GET /api/agent/next-task — OpenCode fetches next prompt
router.get('/agent/next-task', requireWorkspaceAuth, (req: any, res) => {
  const workspace = req.workspace;
  const run = runStore.getActiveRun(workspace.id);

  if (!run) {
    res.status(204).end();
    return;
  }

  // Only return task if stage is agent_executing
  if (run.stage !== 'agent_executing') {
    res.status(204).end();
    return;
  }

  // Build prompt payload
  const payload = {
    workspaceId: workspace.id,
    runId: run.id,
    iteration: run.iteration,
    stage: run.stage,
    prompt: run.latestPrompt,
    objective: workspace.objective,
    checklist: workspace.checklist,
    constraints: workspace.constraints,
    unresolvedIssues: run.unresolvedIssues,
  };

  res.json(payload);
});

// POST /api/agent/result — OpenCode submits execution result
router.post('/agent/result', requireWorkspaceAuth, (req: any, res) => {
  const workspace = req.workspace;
  const run = runStore.getActiveRun(workspace.id);

  if (!run) {
    res.status(404).json({ error: 'No active run found' });
    return;
  }

  // Validate stage
  if (run.stage !== 'awaiting_result' && run.stage !== 'agent_executing') {
    res.status(400).json({ error: `Cannot accept result in stage: ${run.stage}` });
    return;
  }

  const body = req.body as SubmitResultPayload;
  if (!body.message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  // Build agent response
  const response: AgentResponse = {
    message: body.message,
    diffSummary: body.diffSummary || '',
    filesTouched: body.filesTouched || [],
    commandsRun: body.commandsRun || [],
    testResults: body.testResults || '',
    errorsFound: body.errorsFound || [],
    suggestedFixes: body.suggestedFixes || [],
  };

  // Update run with response
  runStore.updateRun(run.id, {
    latestResponse: response,
    iteration: run.iteration + 1,
  });

  runStore.addRunEvent(run.id, {
    stage: run.stage,
    type: 'result_received',
    data: {
      filesTouched: response.filesTouched,
      errorsFound: response.errorsFound,
      iteration: run.iteration + 1,
    },
  });

  // Transition to auditing
  if (canTransition(run.stage, 'result_received')) {
    const newStage = nextStage(run.stage, 'result_received');
    runStore.transitionRunStage(run.id, newStage, 'result_received');
  }

  const updated = runStore.getRun(run.id);
  res.json({ status: 'ok', run: updated });
});

// GET /api/agent/status — OpenCode checks run status
router.get('/agent/status', requireWorkspaceAuth, (req: any, res) => {
  const workspace = req.workspace;
  const run = runStore.getActiveRun(workspace.id);

  if (!run) {
    res.json({ connected: true, active: false });
    return;
  }

  res.json({
    connected: true,
    active: true,
    runId: run.id,
    stage: run.stage,
    iteration: run.iteration,
    status: run.status,
  });
});

export default router;
