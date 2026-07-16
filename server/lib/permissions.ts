import type { Workspace } from '../../src/types/vibeloop.js';
import * as workspaceStore from '../db/workspaceStore.js';

export function validateWorkspaceKey(key: string): Workspace | null {
  const workspace = workspaceStore.getWorkspaceByKey(key);
  if (!workspace) return null;
  if (workspace.revokedAt) return null;
  return workspace;
}

export function canAccessRun(key: string, runWorkspaceId: string): boolean {
  const workspace = validateWorkspaceKey(key);
  if (!workspace) return false;
  return workspace.id === runWorkspaceId;
}
