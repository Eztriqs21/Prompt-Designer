import type {
  AuditResult,
  Run,
  Workspace,
  RunStage,
} from '../../src/types/vibeloop.js';
import { getConfig } from './guardrails.js';

export interface ContinueDecision {
  shouldContinue: boolean;
  reason: string;
  nextStage: RunStage;
}

export function decideNextAction(
  audit: AuditResult,
  run: Run,
  workspace: Workspace
): ContinueDecision {
  const config = getConfig();

  // Check iteration limit
  if (run.iteration >= config.maxIterations) {
    return {
      shouldContinue: false,
      reason: `Maximum iterations reached (${config.maxIterations})`,
      nextStage: 'partial_complete',
    };
  }

  // All items done
  const allDone = workspace.checklist.every((item) => item.status === 'done');
  if (allDone && audit.status === 'pass') {
    return {
      shouldContinue: false,
      reason: 'All checklist items completed and audit passed',
      nextStage: 'complete',
    };
  }

  // Blocked
  if (audit.status === 'blocked') {
    return {
      shouldContinue: false,
      reason: 'Audit detected blocking issues that cannot be resolved automatically',
      nextStage: 'partial_complete',
    };
  }

  // No progress detection (same issues repeating)
  if (audit.issues.length > 0 && audit.regressionDetected) {
    return {
      shouldContinue: false,
      reason: 'Regression detected — previously fixed issues have reappeared',
      nextStage: 'partial_complete',
    };
  }

  // Needs fix
  if (audit.status === 'needs_fix') {
    return {
      shouldContinue: true,
      reason: 'Audit found issues that need fixing',
      nextStage: 'needs_fix',
    };
  }

  // More work needed (pass with notes or pass but items remain)
  if (audit.status === 'pass' || audit.status === 'pass_with_notes') {
    const pendingItems = workspace.checklist.filter((item) => item.status === 'pending');
    if (pendingItems.length > 0) {
      return {
        shouldContinue: true,
        reason: `${pendingItems.length} checklist items still pending`,
        nextStage: 'continuing',
      };
    }
  }

  // Default: complete
  return {
    shouldContinue: false,
    reason: 'No further action required',
    nextStage: 'complete',
  };
}
