import { v4 as uuidv4 } from 'uuid';
import type {
  Workspace,
  CreateWorkspacePayload,
  ChecklistItem,
} from '../../src/types/vibeloop.js';

const fs = await import('fs');
const path = await import('path');

const DB_DIR = path.join(process.cwd(), 'server', 'db');
const DATA_PATH = path.join(DB_DIR, 'workspaces.json');

const writeLocks = new Map<string, Promise<void>>();

async function withWriteLock<T>(key: string, fn: () => T): Promise<T> {
  while (writeLocks.has(key)) {
    await writeLocks.get(key);
  }
  let release: (() => void) | undefined;
  const lock = new Promise<void>((resolve) => {
    release = resolve;
  });
  writeLocks.set(key, lock);
  try {
    return fn();
  } finally {
    writeLocks.delete(key);
    release!();
  }
}

function ensureDbExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, '[]', 'utf-8');
  }
}

function readWorkspaces(): Workspace[] {
  ensureDbExists();
  const data = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(data);
}

function writeWorkspaces(workspaces: Workspace[]) {
  ensureDbExists();
  fs.writeFileSync(DATA_PATH, JSON.stringify(workspaces, null, 2), 'utf-8');
}

function generateWorkspaceKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'vloop_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export function createWorkspace(payload: CreateWorkspacePayload): Workspace {
  const checklist: ChecklistItem[] = payload.checklist.map((item) => ({
    ...item,
    id: uuidv4(),
    status: 'pending' as const,
  }));

  const workspace: Workspace = {
    id: uuidv4(),
    key: generateWorkspaceKey(),
    projectName: payload.projectName,
    objective: payload.objective,
    checklist,
    constraints: payload.constraints || [],
    referenceNotes: payload.referenceNotes || '',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const workspaces = readWorkspaces();
  workspaces.unshift(workspace);
  writeWorkspaces(workspaces);
  return workspace;
}

export function getWorkspace(id: string): Workspace | undefined {
  return readWorkspaces().find((w) => w.id === id);
}

export function getWorkspaceByKey(key: string): Workspace | undefined {
  return readWorkspaces().find((w) => w.key === key);
}

export function updateWorkspace(id: string, patch: Partial<Workspace>): Workspace | undefined {
  return withWriteLock('workspaces', () => {
    const workspaces = readWorkspaces();
    const idx = workspaces.findIndex((w) => w.id === id);
    if (idx === -1) return undefined;
    workspaces[idx] = {
      ...workspaces[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    writeWorkspaces(workspaces);
    return workspaces[idx];
  });
}

export function revokeWorkspaceKey(id: string): Workspace | undefined {
  return updateWorkspace(id, {
    status: 'revoked',
    revokedAt: new Date().toISOString(),
  });
}

export function listWorkspaces(): Workspace[] {
  return readWorkspaces();
}

export function deleteWorkspace(id: string): boolean {
  return withWriteLock('workspaces', () => {
    const workspaces = readWorkspaces();
    const filtered = workspaces.filter((w) => w.id !== id);
    if (filtered.length === workspaces.length) return false;
    writeWorkspaces(filtered);
    return true;
  });
}
