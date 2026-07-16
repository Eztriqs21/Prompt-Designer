export const MAX_ITERATIONS = 10;
export const MAX_PROMPT_LENGTH = 50000;
export const RESULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const STUCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_WORKSPACES_PER_DAY = 50;
export const MAX_RUNS_PER_WORKSPACE = 20;

export function validatePromptLength(prompt: string): boolean {
  return prompt.length <= MAX_PROMPT_LENGTH;
}

export function isRunStale(lastEventAt: string): boolean {
  const lastMs = new Date(lastEventAt).getTime();
  return Date.now() - lastMs > STUCK_TIMEOUT_MS;
}

export function isResultTimedOut(resultSubmittedAt: string): boolean {
  const submittedMs = new Date(resultSubmittedAt).getTime();
  return Date.now() - submittedMs > RESULT_TIMEOUT_MS;
}
