import type {
  Workspace,
  Run,
  AuditResult,
  ChecklistCoverageEntry,
  Issue,
} from '../../src/types/vibeloop.js';
import {
  classifyIssues,
  checkChecklistCoverage,
  detectRegressions,
} from './issueClassifier.js';

export interface AuditInput {
  agentMessage: string;
  filesTouched?: string[];
  errorsFound?: string[];
  testResults?: string;
  done?: boolean;
  compacted?: boolean;
}

export interface AuditOutput {
  status: 'pass' | 'pass_with_notes' | 'needs_fix' | 'blocked';
  summary: string;
  issues: Issue[];
  checklistCoverage: ChecklistCoverageEntry[];
  regressionDetected: boolean;
}

const previousAudits: Map<string, AuditResult[]> = new Map();

export function auditAgentResponse(
  input: AuditInput,
  workspace: Workspace,
  run: Run
): AuditOutput {
  // Build issues from agent response
  const issues: Issue[] = [];

  // Check for errors in agent response
  if (input.errorsFound && input.errorsFound.length > 0) {
    input.errorsFound.forEach((error, idx) => {
      issues.push({
        id: `error-${idx}`,
        severity: 'major',
        category: 'runtime-error',
        description: error,
        suggestion: 'Review and fix the reported error',
        fixable: true,
      });
    });
  }

  // Check for test failures
  if (input.testResults && input.testResults.toLowerCase().includes('fail')) {
    issues.push({
      id: 'test-failure',
      severity: 'major',
      category: 'test-failure',
      description: 'Test results indicate failures',
      suggestion: 'Review test output and fix failing tests',
      fixable: true,
    });
  }

  // Check if agent claims completion
  if (input.compacted) {
    issues.push({
      id: 'compaction',
      severity: 'info',
      category: 'context-exhaustion',
      description: 'Agent context was compacted',
      suggestion: 'Agent may have lost context. Consider restarting with a fresh prompt.',
      fixable: false,
    });
  }

  // Check checklist coverage
  const checklistCoverage = checkChecklistCoverage(workspace, input.agentMessage);

  // Detect regressions
  const runAudits = previousAudits.get(run.id) || [];
  const regressionDetected = detectRegressions(runAudits, checklistCoverage);

  if (regressionDetected) {
    issues.push({
      id: 'regression',
      severity: 'critical',
      category: 'regression',
      description: 'Previously completed work has regressed',
      suggestion: 'Review the diff and restore the previous state',
      fixable: true,
    });
  }

  // Check for unaddressed checklist items
  const uncoveredItems = checklistCoverage.filter((c) => !c.covered);
  if (uncoveredItems.length > 0) {
    uncoveredItems.forEach((item) => {
      issues.push({
        id: `uncovered-${item.itemId}`,
        severity: 'minor',
        category: 'checklist-gap',
        description: `Checklist item "${item.label}" was not addressed`,
        suggestion: `Ensure the implementation covers: ${item.label}`,
        fixable: true,
      });
    });
  }

  // Classify overall status
  const decision = classifyIssues(issues);

  // Build summary
  const summary = buildAuditSummary(decision.status, issues, checklistCoverage, run);

  const result: AuditOutput = {
    status: decision.status,
    summary,
    issues,
    checklistCoverage,
    regressionDetected,
  };

  // Store for regression detection
  runAudits.push(result);
  previousAudits.set(run.id, runAudits);

  return result;
}

function buildAuditSummary(
  status: string,
  issues: Issue[],
  coverage: ChecklistCoverageEntry[],
  run: Run
): string {
  const parts: string[] = [];

  parts.push(`Audit Status: ${status.toUpperCase()}`);
  parts.push(`Iteration: ${run.iteration}`);

  const covered = coverage.filter((c) => c.covered).length;
  const total = coverage.length;
  parts.push(`Checklist Coverage: ${covered}/${total}`);

  if (issues.length > 0) {
    const critical = issues.filter((i) => i.severity === 'critical').length;
    const major = issues.filter((i) => i.severity === 'major').length;
    const minor = issues.filter((i) => i.severity === 'minor').length;
    parts.push(`Issues: ${critical} critical, ${major} major, ${minor} minor`);
  } else {
    parts.push('Issues: None');
  }

  return parts.join('\n');
}
