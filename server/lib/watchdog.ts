import * as runStore from '../db/runStore.js';
import * as workspaceStore from '../db/workspaceStore.js';
import { isRunStale } from './guardrails.js';

export function checkStaleRuns(): { runId: string; workspaceId: string; reason: string }[] {
  const staleRuns: { runId: string; workspaceId: string; reason: string }[] = [];

  // Get all workspaces
  const workspaces = workspaceStore.listWorkspaces();

  for (const ws of workspaces) {
    const activeRun = runStore.getActiveRun(ws.id);
    if (!activeRun) continue;

    // Check if run is stale
    const lastEvent = activeRun.events[activeRun.events.length - 1];
    if (lastEvent && isRunStale(lastEvent.timestamp)) {
      staleRuns.push({
        runId: activeRun.id,
        workspaceId: ws.id,
        reason: `Run stuck in stage "${activeRun.stage}" since ${lastEvent.timestamp}`,
      });
    }
  }

  return staleRuns;
}

export function pauseStaleRuns(): string[] {
  const stale = checkStaleRuns();
  const paused: string[] = [];

  for (const { runId, reason } of stale) {
    runStore.stopRun(runId, 'paused');
    runStore.addRunEvent(runId, {
      stage: 'auditing',
      type: 'error',
      data: { reason: `Auto-paused: ${reason}` },
    });
    paused.push(runId);
  }

  return paused;
}
