import { v4 as uuidv4 } from 'uuid';
import type {
  Run,
  RunEvent,
  RunStage,
  RunStatus,
  AgentResponse,
  AuditResult,
} from '../../src/types/vibeloop.js';

const fs = await import('fs');
const path = await import('path');

const DB_DIR = path.join(process.cwd(), 'server', 'db');
const DATA_PATH = path.join(DB_DIR, 'runs.json');

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

function readRuns(): Run[] {
  ensureDbExists();
  const data = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(data);
}

function writeRuns(runs: Run[]) {
  ensureDbExists();
  fs.writeFileSync(DATA_PATH, JSON.stringify(runs, null, 2), 'utf-8');
}

export function createRun(workspaceId: string, maxIterations: number): Run {
  const run: Run = {
    id: uuidv4(),
    workspaceId,
    status: 'running',
    stage: 'draft',
    iteration: 0,
    maxIterations,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    (r) => r.workspaceId === workspaceId && r.status === 'running'
  );
}

export function getRunsForWorkspace(workspaceId: string): Run[] {
  return readRuns().filter((r) => r.workspaceId === workspaceId);
}

export function updateRun(id: string, patch: Partial<Run>): Run | undefined {
  return withWriteLock('runs', () => {
    const runs = readRuns();
    const idx = runs.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    runs[idx] = {
      ...runs[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    writeRuns(runs);
    return runs[idx];
  });
}

export function transitionRunStage(
  id: string,
  stage: RunStage,
  data?: Record<string, unknown>
): Run | undefined {
  const run = updateRun(id, { stage });
  if (run && data) {
    addRunEvent(id, {
      stage,
      type: 'state_change',
      data,
    });
  }
  return run;
}

export function addRunEvent(
  runId: string,
  event: Omit<RunEvent, 'id' | 'runId' | 'timestamp'>
): RunEvent {
  return withWriteLock('runs', () => {
    const runs = readRuns();
    const run = runs.find((r) => r.id === runId);
    if (!run) throw new Error('Run not found');

    const fullEvent: RunEvent = {
      id: uuidv4(),
      runId,
      timestamp: new Date().toISOString(),
      ...event,
    };

    // Store events inline in the run for simplicity
    if (!(run as any).events) {
      (run as any).events = [];
    }
    (run as any).events.unshift(fullEvent);

    writeRuns(runs);
    return fullEvent;
  });
}

export function getRunEvents(runId: string): RunEvent[] {
  const run = getRun(runId);
  if (!run) return [];
  return (run as any).events || [];
}

export function stopRun(id: string): Run | undefined {
  return updateRun(id, {
    status: 'stopped',
    stage: 'stopped',
    stoppedAt: new Date().toISOString(),
  });
}

export function completeRun(
  id: string,
  stage: 'complete' | 'partial_complete' | 'failed'
): Run | undefined {
  return updateRun(id, {
    status: 'completed',
    stage,
    completedAt: new Date().toISOString(),
  });
}

export function setRunLatestPrompt(id: string, prompt: string): Run | undefined {
  return updateRun(id, { latestPrompt: prompt });
}

export function setRunLatestResponse(
  id: string,
  response: AgentResponse
): Run | undefined {
  return updateRun(id, { latestResponse: response });
}

export function setRunLatestAudit(
  id: string,
  audit: AuditResult
): Run | undefined {
  return updateRun(id, { latestAudit: audit });
}

export function setRunPlan(id: string, plan: string): Run | undefined {
  return updateRun(id, { plan });
}

export function incrementRunIteration(id: string): Run | undefined {
  const run = getRun(id);
  if (!run) return undefined;
  return updateRun(id, { iteration: run.iteration + 1 });
}
