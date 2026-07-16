import { v4 as uuidv4 } from 'uuid';
import type { Run, RunEvent, WorkflowStage, RunStatus } from '../../src/types/vibeloop.js';

const fs = await import('fs');
const path = await import('path');

const DB_DIR = path.join(process.cwd(), 'server', 'db');
const RUNS_PATH = path.join(DB_DIR, 'runs.json');

const writeLocks = new Map<string, Promise<void>>();

async function withWriteLock<T>(key: string, fn: () => T): Promise<T> {
  while (writeLocks.has(key)) {
    await writeLocks.get(key);
  }
  let release: () => void;
  const lock = new Promise<void>((resolve) => { release = resolve; });
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
  if (!fs.existsSync(RUNS_PATH)) {
    fs.writeFileSync(RUNS_PATH, '[]', 'utf-8');
  }
}

function readRuns(): Run[] {
  ensureDbExists();
  const data = fs.readFileSync(RUNS_PATH, 'utf-8');
  return JSON.parse(data);
}

function writeRuns(runs: Run[]) {
  ensureDbExists();
  fs.writeFileSync(RUNS_PATH, JSON.stringify(runs, null, 2), 'utf-8');
}

export function createRun(workspaceId: string): Run {
  const run: Run = {
    id: uuidv4(),
    workspaceId,
    status: 'running',
    iteration: 0,
    stage: 'initial_implementation',
    latestPrompt: '',
    latestResponse: null,
    latestAudit: null,
    unresolvedIssues: [],
    completedItems: [],
    events: [],
    startedAt: new Date().toISOString(),
  };

  const runs = readRuns();
  runs.unshift(run);
  writeRuns(runs);
  return run;
}

export function getRun(id: string): Run | undefined {
  return readRuns().find((r) => r.id === id);
}

export function getActiveRun(workspaceId: string): Run | undefined {
  return readRuns().find(
    (r) => r.workspaceId === workspaceId && ['running', 'paused'].includes(r.status)
  );
}

export function getRunsForWorkspace(workspaceId: string): Run[] {
  return readRuns().filter((r) => r.workspaceId === workspaceId);
}

export function updateRun(id: string, patch: Partial<Run>): Run | undefined {
  const runs = readRuns();
  const idx = runs.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;

  runs[idx] = { ...runs[idx], ...patch };
  writeRuns(runs);
  return runs[idx];
}

export function addRunEvent(id: string, event: Omit<RunEvent, 'timestamp'>): Run | undefined {
  const runs = readRuns();
  const idx = runs.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;

  runs[idx].events.push({
    ...event,
    timestamp: new Date().toISOString(),
  });
  writeRuns(runs);
  return runs[idx];
}

export function transitionRunStage(id: string, stage: WorkflowStage, trigger: string, extra?: Partial<Run>): Run | undefined {
  const runs = readRuns();
  const idx = runs.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;

  const prev = runs[idx].stage;
  runs[idx].stage = stage;
  if (extra) {
    Object.assign(runs[idx], extra);
  }
  runs[idx].events.push({
    timestamp: new Date().toISOString(),
    stage,
    type: 'stage_change',
    data: { from: prev, to: stage, trigger },
  });
  writeRuns(runs);
  return runs[idx];
}

export function stopRun(id: string, status: RunStatus = 'stopped'): Run | undefined {
  const run = getRun(id);
  if (!run) return undefined;

  return updateRun(id, {
    status,
    stage: 'complete',
    endedAt: new Date().toISOString(),
    events: [
      ...run.events,
      {
        timestamp: new Date().toISOString(),
        stage: run.stage,
        type: 'stopped',
        data: { reason: status },
      },
    ],
  });
}
