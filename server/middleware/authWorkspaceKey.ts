import type { Request, Response, NextFunction } from 'express';
import * as workspaceStore from '../db/workspaceStore.js';

export interface AuthenticatedRequest extends Request {
  workspace?: any;
}

export function requireWorkspaceAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
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

  if (workspace.status === 'revoked') {
    res.status(403).json({ error: 'Workspace key has been revoked' });
    return;
  }

  req.workspace = workspace;
  next();
}
