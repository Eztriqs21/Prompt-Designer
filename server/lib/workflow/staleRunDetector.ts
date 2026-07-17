import type { Run } from '../../src/types/vibeloop.js';
import { isRunStale, getConfig } from './guardrails.js';

export function detectStaleRuns(runs: Run[]): Run[] {
  const config = getConfig();
  return runs.filter(
    (run) =>
      run.status === 'running' && isRunStale(run.updatedAt, config.staleRunTimeoutMs)
  );
}

export function autoPauseStaleRuns(
  runs: Run[],
  updateRun: (id: string, patch: Partial<Run>) => void
): string[] {
  const staleRuns = detectStaleRuns(runs);
  const pausedIds: string[] = [];

  for (const run of staleRuns) {
    updateRun(run.id, {
      status: 'paused',
      stage: 'awaiting_agent_completion',
    });
    pausedIds.push(run.id);
  }

  return pausedIds;
}
