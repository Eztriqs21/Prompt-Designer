import { Router } from 'express';
import * as runStore from '../db/runStore.js';
import * as workspaceStore from '../db/workspaceStore.js';
import { generateSummary } from '../lib/summaryGenerator.js';

const router = Router();

// GET /api/runs/:runId/summary — Get final completion summary
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

  const summary = generateSummary(workspace, run);
  res.json(summary);
});

export default router;
