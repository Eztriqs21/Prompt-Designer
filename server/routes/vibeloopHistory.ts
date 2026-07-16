import { Router } from 'express';
import * as runStore from '../db/runStore.js';
import * as workspaceStore from '../db/workspaceStore.js';

const router = Router();

// GET /api/workspaces/:id/history — All runs for a workspace
router.get('/workspaces/:id/history', (req, res) => {
  const workspace = workspaceStore.getWorkspace(req.params.id);
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  const runs = runStore.getRunsForWorkspace(workspace.id);
  res.json(runs);
});

// GET /api/runs/:runId/full — Run with all events, prompts, responses, audits
router.get('/runs/:runId/full', (req, res) => {
  const run = runStore.getRun(req.params.runId);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  const workspace = workspaceStore.getWorkspace(run.workspaceId);
  res.json({
    run,
    workspace: workspace ? {
      id: workspace.id,
      projectName: workspace.projectName,
      objective: workspace.objective,
      checklist: workspace.checklist,
    } : null,
  });
});

export default router;
