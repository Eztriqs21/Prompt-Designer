import type {
  Workspace,
  Run,
  AuditResult,
  Issue,
  ChecklistCoverageEntry,
} from '../../src/types/vibeloop.js';

export interface AuditDecision {
  status: 'pass' | 'pass_with_notes' | 'needs_fix' | 'blocked';
  reason: string;
}

export function classifyIssues(issues: Issue[]): AuditDecision {
  const criticalIssues = issues.filter((i) => i.severity === 'critical');
  const majorIssues = issues.filter((i) => i.severity === 'major');

  if (criticalIssues.length > 0) {
    return {
      status: 'blocked',
      reason: `${criticalIssues.length} critical issue(s) found`,
    };
  }

  if (majorIssues.length > 0) {
    return {
      status: 'needs_fix',
      reason: `${majorIssues.length} major issue(s) found`,
    };
  }

  if (issues.length > 0) {
    return {
      status: 'pass_with_notes',
      reason: `${issues.length} minor/info issue(s) found`,
    };
  }

  return {
    status: 'pass',
    reason: 'No issues found',
  };
}

export function checkChecklistCoverage(
  workspace: Workspace,
  agentResponse: string
): ChecklistCoverageEntry[] {
  return workspace.checklist.map((item) => {
    const labelLower = item.label.toLowerCase();
    const descLower = item.description.toLowerCase();
    const responseLower = agentResponse.toLowerCase();

    // Simple heuristic: check if the item label or description appears in the response
    const covered =
      responseLower.includes(labelLower) ||
      responseLower.includes(descLower) ||
      responseLower.includes(`checklist item ${item.id}`);

    return {
      itemId: item.id,
      label: item.label,
      covered,
      notes: covered ? 'Referenced in agent response' : 'Not found in response',
    };
  });
}

export function detectRegressions(
  previousAudits: AuditResult[],
  currentCoverage: ChecklistCoverageEntry[]
): boolean {
  if (previousAudits.length === 0) return false;

  const lastAudit = previousAudits[previousAudits.length - 1];
  const previouslyCovered = lastAudit.checklistCoverage
    .filter((c) => c.covered)
    .map((c) => c.itemId);

  const currentlyNotCovered = currentCoverage
    .filter((c) => !c.covered)
    .map((c) => c.itemId);

  // Regression: items that were covered before but are not covered now
  return previouslyCovered.some((id) => currentlyNotCovered.includes(id));
}
