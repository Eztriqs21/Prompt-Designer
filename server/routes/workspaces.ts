import { Router } from 'express';
import * as workspaceStore from '../db/workspaceStore.js';
import type { CreateWorkspacePayload } from '../../src/types/vibeloop.js';

const router = Router();

// POST /api/workspaces — Create workspace
router.post('/workspaces', (req, res) => {
  const { projectName, objective, checklist, constraints, referenceNotes } = req.body as CreateWorkspacePayload;

  if (!projectName || !objective || !Array.isArray(checklist)) {
    res.status(400).json({ error: 'projectName, objective, and checklist[] are required' });
    return;
  }

  const workspace = workspaceStore.createWorkspace({
    projectName,
    objective,
    checklist,
    constraints: constraints || [],
    referenceNotes: referenceNotes || '',
  });

  res.status(201).json(workspace);
});

// GET /api/workspaces — List all workspaces
router.get('/workspaces', (_req, res) => {
  const workspaces = workspaceStore.listWorkspaces();
  res.json(workspaces);
});

// GET /api/workspaces/:id — Get workspace
router.get('/workspaces/:id', (req, res) => {
  const workspace = workspaceStore.getWorkspace(req.params.id);
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }
  res.json(workspace);
});

// PATCH /api/workspaces/:id — Update workspace
router.patch('/workspaces/:id', (req, res) => {
  const updated = workspaceStore.updateWorkspace(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }
  res.json(updated);
});

// DELETE /api/workspaces/:id — Delete workspace
router.delete('/workspaces/:id', (req, res) => {
  const deleted = workspaceStore.deleteWorkspace(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }
  res.status(204).end();
});

// POST /api/workspaces/:id/revoke — Revoke workspace key
router.post('/workspaces/:id/revoke', (req, res) => {
  const updated = workspaceStore.revokeWorkspaceKey(req.params.id);
  if (!updated) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }
  res.json({ message: 'Key revoked', workspace: updated });
});

export default router;
