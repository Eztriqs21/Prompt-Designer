import type { VibeLoopConfig } from '../../src/types/vibeloop.js';

// Default configuration
const DEFAULT_CONFIG: VibeLoopConfig = {
  maxIterations: parseInt(process.env.VIBELOOP_MAX_ITERATIONS || '10', 10),
  staleRunTimeoutMs: parseInt(process.env.VIBELOOP_STALE_TIMEOUT_MS || '300000', 10), // 5 minutes
  resultTimeoutMs: parseInt(process.env.VIBELOOP_RESULT_TIMEOUT_MS || '600000', 10), // 10 minutes
};

export function getConfig(): VibeLoopConfig {
  return {
    maxIterations: parseInt(process.env.VIBELOOP_MAX_ITERATIONS || String(DEFAULT_CONFIG.maxIterations), 10),
    staleRunTimeoutMs: parseInt(process.env.VIBELOOP_STALE_TIMEOUT_MS || String(DEFAULT_CONFIG.staleRunTimeoutMs), 10),
    resultTimeoutMs: parseInt(process.env.VIBELOOP_RESULT_TIMEOUT_MS || String(DEFAULT_CONFIG.resultTimeoutMs), 10),
  };
}

export function validatePromptLength(prompt: string): boolean {
  const maxLen = parseInt(process.env.VIBELOOP_MAX_PROMPT_LENGTH || '50000', 10);
  return prompt.length <= maxLen;
}

export function validateIterationLimit(current: number, max: number): boolean {
  return current < max;
}

export function isRunStale(lastUpdatedAt: string, timeoutMs?: number): boolean {
  const timeout = timeoutMs || getConfig().staleRunTimeoutMs;
  const lastUpdate = new Date(lastUpdatedAt).getTime();
  return Date.now() - lastUpdate > timeout;
}

export function isResultTimedOut(startedAt: string, timeoutMs?: number): boolean {
  const timeout = timeoutMs || getConfig().resultTimeoutMs;
  const start = new Date(startedAt).getTime();
  return Date.now() - start > timeout;
}
