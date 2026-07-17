import { Router } from 'express';
import type { CreateWorkspacePayload } from '../../src/types/vibeloop.js';
import * as workspaceStore from '../db/workspaceStore.js';
import * as runStore from '../db/runStore.js';
import { getConfig } from '../lib/workflow/guardrails.js';
import { canStartRun, canStopRun } from '../lib/workflow/permissions.js';
import { buildBlueprintPrompt } from '../lib/workflow/blueprintPrompt.js';
import { writePromptFile, clearResponseFile, readConfigFile } from '../lib/workflow/bridgeManager.js';

const router = Router();

// Create workspace
router.post('/workspaces', (req, res) => {
  const { projectName, objective, checklist, constraints, referenceNotes } =
    req.body as CreateWorkspacePayload;

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

// List workspaces
router.get('/workspaces', (_req, res) => {
  const workspaces = workspaceStore.listWorkspaces();
  res.json(workspaces);
});

// Get workspace
router.get('/workspaces/:id', (req, res) => {
  const workspace = workspaceStore.getWorkspace(req.params.id);
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }
  res.json(workspace);
});

// Update workspace
router.patch('/workspaces/:id', (req, res) => {
  const updated = workspaceStore.updateWorkspace(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }
  res.json(updated);
});

// Delete workspace
router.delete('/workspaces/:id', (req, res) => {
  const deleted = workspaceStore.deleteWorkspace(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }
  res.status(204).end();
});

// Revoke workspace key
router.post('/workspaces/:id/revoke', (req, res) => {
  const revoked = workspaceStore.revokeWorkspaceKey(req.params.id);
  if (!revoked) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }
  res.json(revoked);
});

// Start run
router.post('/workspaces/:id/run', (req, res) => {
  const workspace = workspaceStore.getWorkspace(req.params.id);
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  const activeRun = runStore.getActiveRun(workspace.id);
  const canStart = canStartRun(workspace, activeRun);
  if (!canStart.allowed) {
    res.status(409).json({ error: canStart.reason });
    return;
  }

  const config = getConfig();
  const run = runStore.createRun(workspace.id, config.maxIterations);

  // Generate initial blueprint prompt
  const prompt = buildBlueprintPrompt(workspace, run);
  runStore.setRunLatestPrompt(run.id, prompt);
  runStore.transitionRunStage(run.id, 'planning', { trigger: 'start' });

  // Write to bridge so Python automation can pick it up
  const bridgeConfig = readConfigFile();
  const chatName = bridgeConfig?.chatName || workspace.projectName;
  writePromptFile('plan', prompt, chatName, workspace.id);

  res.status(201).json(run);
});

// Stop run
router.post('/workspaces/:id/stop', (req, res) => {
  const activeRun = runStore.getActiveRun(req.params.id);
  if (!activeRun) {
    res.status(404).json({ error: 'No active run found' });
    return;
  }

  const canStop = canStopRun(activeRun);
  if (!canStop.allowed) {
    res.status(409).json({ error: canStop.reason });
    return;
  }

  const stopped = runStore.stopRun(activeRun.id);
  clearResponseFile();
  res.json(stopped);
});

// List runs for workspace
router.get('/workspaces/:id/runs', (req, res) => {
  const runs = runStore.getRunsForWorkspace(req.params.id);
  res.json(runs);
});

// Get run
router.get('/runs/:runId', (req, res) => {
  const run = runStore.getRun(req.params.runId);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }
  res.json(run);
});

// Get run events
router.get('/runs/:runId/events', (req, res) => {
  const events = runStore.getRunEvents(req.params.runId);
  res.json(events);
});

// Get run history (alias for /workspaces/:id/runs)
router.get('/workspaces/:id/history', (req, res) => {
  const runs = runStore.getRunsForWorkspace(req.params.id);
  res.json(runs);
});

// Get full run details
router.get('/runs/:runId/full', (req, res) => {
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

  res.json({ run, workspace });
});

export default router;
