import type { AuditResult, Workspace, Run, WorkflowStage } from '../../src/types/vibeloop.js';

const MAX_ITERATIONS = 10;
const MAX_CONSECUTIVE_NO_PROGRESS = 2;

interface ContinueDecision {
  shouldContinue: boolean;
  reason: string;
  nextStage: WorkflowStage;
}

export function decideNextAction(
  audit: AuditResult,
  run: Run,
  workspace: Workspace
): ContinueDecision {
  const allItemsDone = workspace.checklist.every((item) => item.status === 'done');
  const fixableIssues = audit.issues.filter((i) => i.fixable);
  const hasFixableIssues = fixableIssues.length > 0;

  // Check iteration limit
  if (run.iteration >= MAX_ITERATIONS) {
    return {
      shouldContinue: false,
      reason: `Reached maximum iterations (${MAX_ITERATIONS})`,
      nextStage: 'final_summary',
    };
  }

  // Check if all checklist items are done and no fixable issues
  if (allItemsDone && !hasFixableIssues) {
    return {
      shouldContinue: false,
      reason: 'All checklist items complete, no fixable issues',
      nextStage: 'complete',
    };
  }

  // Check for blocked status
  if (audit.status === 'blocked') {
    return {
      shouldContinue: false,
      reason: 'Audit blocked — cannot proceed',
      nextStage: 'final_summary',
    };
  }

  // Check for no progress (same issues repeating)
  const recentEvents = run.events.slice(-6); // Last 3 iterations (2 events each)
  const recentFixes = recentEvents.filter((e) => e.type === 'fix_generated');
  if (recentFixes.length >= MAX_CONSECUTIVE_NO_PROGRESS) {
    // Check if the same issues keep appearing
    const currentIssueDescs = fixableIssues.map((i) => i.description).sort().join('|');
    const lastRun = runStore_getLastFixIssues(run);
    if (lastRun === currentIssueDescs) {
      return {
        shouldContinue: false,
        reason: 'No progress — same issues repeating',
        nextStage: 'final_summary',
      };
    }
  }

  // If fixable issues remain, continue with fix cycle
  if (hasFixableIssues) {
    return {
      shouldContinue: true,
      reason: `${fixableIssues.length} fixable issue(s) remain`,
      nextStage: 'needs_fix',
    };
  }

  // If checklist items remain but no fixable issues, still continue
  const pendingItems = workspace.checklist.filter((item) => item.status !== 'done');
  if (pendingItems.length > 0) {
    return {
      shouldContinue: true,
      reason: `${pendingItems.length} checklist item(s) not yet complete`,
      nextStage: 'needs_fix',
    };
  }

  // Default: stop
  return {
    shouldContinue: false,
    reason: 'No more meaningful fixes possible',
    nextStage: 'final_summary',
  };
}

// Helper to extract last fix issues for comparison
function runStore_getLastFixIssues(run: Run): string {
  const fixEvents = run.events.filter((e) => e.type === 'fix_generated');
  if (fixEvents.length === 0) return '';
  const last = fixEvents[fixEvents.length - 1];
  return JSON.stringify(last.data?.issues || []);
}
