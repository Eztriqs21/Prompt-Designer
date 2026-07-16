import { Router } from 'express';
import * as runStore from '../db/runStore.js';
import * as workspaceStore from '../db/workspaceStore.js';
import { canTransition, nextStage } from '../lib/stateMachine.js';
import { buildInitialPrompt, buildFixPrompt } from '../lib/promptBuilder.js';

const router = Router();

// POST /api/workspaces/:id/run — Start automation run
router.post('/workspaces/:id/run', (req, res) => {
  const workspace = workspaceStore.getWorkspace(req.params.id);
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  // Check for existing active run
  const existing = runStore.getActiveRun(workspace.id);
  if (existing) {
    res.status(409).json({ error: 'Active run already exists', runId: existing.id });
    return;
  }

  // Create run
  const run = runStore.createRun(workspace.id);

  // Build initial prompt
  const prompt = buildInitialPrompt(workspace);
  runStore.updateRun(run.id, { latestPrompt: prompt });
  runStore.addRunEvent(run.id, { stage: 'initial_implementation', type: 'started', data: { workspaceId: workspace.id } });

  // Transition to agent_executing
  if (canTransition('initial_implementation', 'start')) {
    runStore.transitionRunStage(run.id, nextStage('initial_implementation', 'start'), 'start');
  }

  // Mark workspace as active
  workspaceStore.updateWorkspace(workspace.id, { status: 'active' });

  const updated = runStore.getRun(run.id);
  res.status(201).json(updated);
});

// POST /api/workspaces/:id/stop — Stop active run
router.post('/workspaces/:id/stop', (req, res) => {
  const run = runStore.getActiveRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'No active run found' });
    return;
  }

  const stopped = runStore.stopRun(run.id, 'stopped');
  workspaceStore.updateWorkspace(req.params.id, { status: 'ready' });
  res.json(stopped);
});

// GET /api/workspaces/:id/runs — List runs for workspace
router.get('/workspaces/:id/runs', (req, res) => {
  const runs = runStore.getRunsForWorkspace(req.params.id);
  res.json(runs);
});

// GET /api/runs/:runId — Get run details
router.get('/runs/:runId', (req, res) => {
  const run = runStore.getRun(req.params.runId);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }
  res.json(run);
});

// GET /api/runs/:runId/events — Get run event history
router.get('/runs/:runId/events', (req, res) => {
  const run = runStore.getRun(req.params.runId);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }
  res.json(run.events);
});

export default router;
