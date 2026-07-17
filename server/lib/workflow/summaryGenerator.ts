import type {
  AuditResult,
  Run,
  Workspace,
  CompletionSummary,
  Issue,
} from '../../src/types/vibeloop.js';

export function generateSummary(
  run: Run,
  workspace: Workspace,
  audit: AuditResult | null,
  allAudits: AuditResult[]
): CompletionSummary {
  const completedItems = workspace.checklist
    .filter((item) => item.status === 'done')
    .map((item) => item.label);

  const unresolvedIssues = audit?.issues || [];

  const duration = calculateDuration(run.startedAt, run.completedAt || run.stoppedAt || new Date().toISOString());

  let status: 'complete' | 'partial_complete' | 'failed';
  if (run.stage === 'complete') {
    status = 'complete';
  } else if (run.stage === 'failed') {
    status = 'failed';
  } else {
    status = 'partial_complete';
  }

  const notes = generateNotes(run, workspace, audit, allAudits);

  return {
    status,
    totalItems: workspace.checklist.length,
    completedItems: completedItems.length,
    unresolvedIssues: unresolvedIssues.length,
    iterations: run.iteration,
    duration,
    completedChecklistItems: completedItems,
    unresolvedIssueList: unresolvedIssues,
    notes,
  };
}

function calculateDuration(start: string, end: string): string {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const diffMs = endMs - startMs;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function generateNotes(
  run: Run,
  workspace: Workspace,
  audit: AuditResult | null,
  allAudits: AuditResult[]
): string {
  const parts: string[] = [];

  if (run.stage === 'complete') {
    parts.push('All checklist items were completed successfully.');
  } else if (run.stage === 'stopped') {
    parts.push('Run was stopped by the user.');
  } else if (run.stage === 'failed') {
    parts.push('Run failed due to an error.');
  } else {
    const pending = workspace.checklist.filter((i) => i.status === 'pending');
    parts.push(`${pending.length} checklist item(s) remain incomplete.`);
  }

  if (allAudits.length > 0) {
    parts.push(`Total audits performed: ${allAudits.length}.`);
  }

  if (audit?.regressionDetected) {
    parts.push('Regression detected during the run.');
  }

  return parts.join(' ');
}
