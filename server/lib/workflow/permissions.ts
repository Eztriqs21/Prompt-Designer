import type { Workspace, Run } from '../../src/types/vibeloop.js';
import { getConfig } from './guardrails.js';

export function validateWorkspaceKey(key: string, workspaceStore: any): boolean {
  const workspace = workspaceStore.getWorkspaceByKey(key);
  if (!workspace) return false;
  if (workspace.status === 'revoked') return false;
  return true;
}

export function canAccessRun(
  workspaceId: string,
  run: Run | undefined
): boolean {
  if (!run) return false;
  return run.workspaceId === workspaceId;
}

export function canStartRun(
  workspace: Workspace,
  activeRun: Run | undefined
): { allowed: boolean; reason?: string } {
  if (workspace.status === 'revoked') {
    return { allowed: false, reason: 'Workspace key has been revoked' };
  }

  if (activeRun) {
    return { allowed: false, reason: 'A run is already active for this workspace' };
  }

  return { allowed: true };
}

export function canStopRun(run: Run): { allowed: boolean; reason?: string } {
  if (run.status !== 'running') {
    return { allowed: false, reason: 'Run is not active' };
  }

  return { allowed: true };
}
