import { v4 as uuidv4 } from 'uuid';
import type { AgentResponse, AuditResult, Workspace, Run, Issue, ChecklistCoverageEntry } from '../../src/types/vibeloop.js';

function classifyError(error: string): Issue {
  const lower = error.toLowerCase();
  let severity: Issue['severity'] = 'major';
  let category = 'error';

  if (lower.includes('build') || lower.includes('compile') || lower.includes('syntax')) {
    severity = 'critical';
    category = 'build_error';
  } else if (lower.includes('test') || lower.includes('assert')) {
    severity = 'major';
    category = 'test_failure';
  } else if (lower.includes('lint') || lower.includes('warning')) {
    severity = 'minor';
    category = 'lint_warning';
  }

  return {
    id: uuidv4(),
    severity,
    category,
    description: error,
    suggestion: `Fix the ${category.replace('_', ' ')}`,
    fixable: true,
  };
}

function checkChecklistCoverage(
  response: AgentResponse,
  checklist: Workspace['checklist']
): ChecklistCoverageEntry[] {
  const responseText = response.message.toLowerCase();
  const filesText = response.filesTouched.join(' ').toLowerCase();

  return checklist.map((item) => {
    const labelLower = item.label.toLowerCase();
    const descLower = (item.description || '').toLowerCase();

    // Check if the response mentions the item
    const mentioned =
      responseText.includes(labelLower) ||
      responseText.includes(descLower) ||
      filesText.includes(labelLower);

    return {
      itemId: item.id,
      covered: mentioned,
      notes: mentioned ? 'Referenced in response' : 'Not found in response',
    };
  });
}

export async function auditAgentResponse(
  response: AgentResponse,
  workspace: Workspace,
  run: Run
): Promise<AuditResult> {
  const issues: Issue[] = [];

  // Check for errors
  for (const error of response.errorsFound) {
    issues.push(classifyError(error));
  }

  // Check for suggested fixes that weren't applied
  if (response.suggestedFixes.length > 0) {
    issues.push({
      id: uuidv4(),
      severity: 'minor',
      category: 'suggested_fix',
      description: `${response.suggestedFixes.length} suggested fix(es) not applied`,
      suggestion: response.suggestedFixes.join('; '),
      fixable: true,
    });
  }

  // Check checklist coverage
  const coverage = checkChecklistCoverage(response, workspace);

  // Check for uncovered high-priority items
  const uncovered = coverage.filter((c) => !c.covered);
  for (const entry of uncovered) {
    const item = workspace.checklist.find((i) => i.id === entry.itemId);
    if (item && item.priority === 'high') {
      issues.push({
        id: uuidv4(),
        severity: 'major',
        category: 'missing_feature',
        description: `High-priority feature not addressed: ${item.label}`,
        suggestion: `Implement ${item.label}: ${item.description || 'No description'}`,
        fixable: true,
      });
    }
  }

  // Check for regressions (previously completed items not in current response)
  const prevCompleted = run.completedItems;
  const nowMentioned = coverage.filter((c) => c.covered).map((c) => c.itemId);
  const regressions = prevCompleted.filter((id) => !nowMentioned.includes(id));
  if (regressions.length > 0) {
    issues.push({
      id: uuidv4(),
      severity: 'critical',
      category: 'regression',
      description: `${regressions.length} previously completed item(s) not confirmed in latest response`,
      suggestion: 'Verify previously completed features still work',
      fixable: true,
    });
  }

  // Determine overall status
  let status: AuditResult['status'];
  const hasCritical = issues.some((i) => i.severity === 'critical');
  const hasMajor = issues.some((i) => i.severity === 'major');
  const hasFixable = issues.some((i) => i.fixable);

  if (hasCritical) {
    status = 'needs_fix';
  } else if (hasMajor) {
    status = 'needs_fix';
  } else if (hasFixable) {
    status = 'pass_with_notes';
  } else {
    status = 'pass';
  }

  // Build summary
  const allCovered = coverage.every((c) => c.covered);
  const summary = [
    `Audit: ${status}`,
    `Checklist coverage: ${coverage.filter((c) => c.covered).length}/${coverage.length} items`,
    `Issues found: ${issues.length}`,
    hasCritical ? 'CRITICAL issues detected' : '',
    regressions.length > 0 ? `${regressions.length} regressions detected` : '',
  ]
    .filter(Boolean)
    .join('. ');

  // Update checklist item statuses based on coverage
  for (const entry of coverage) {
    const item = workspace.checklist.find((i) => i.id === entry.itemId);
    if (item) {
      item.status = entry.covered ? 'done' : item.status;
    }
  }

  return {
    status,
    issues,
    summary,
    checklistCoverage: coverage,
  };
}
