import type { Workspace, Run, CompletionSummary } from '../../src/types/vibeloop.js';

export function generateSummary(workspace: Workspace, run: Run): CompletionSummary {
  const completedItems = workspace.checklist
    .filter((item) => item.status === 'done' || run.completedItems.includes(item.id))
    .map((item) => ({ id: item.id, label: item.label }));

  const totalChecklistItems = workspace.checklist.length;
  const completedCount = completedItems.length;
  const unresolvedIssues = run.unresolvedIssues;

  // Calculate duration
  const startMs = new Date(run.startedAt).getTime();
  const endMs = run.endedAt ? new Date(run.endedAt).getTime() : Date.now();
  const durationMs = endMs - startMs;
  const durationMinutes = Math.floor(durationMs / 60000);
  const durationSeconds = Math.floor((durationMs % 60000) / 1000);
  const duration = durationMinutes > 0
    ? `${durationMinutes}m ${durationSeconds}s`
    : `${durationSeconds}s`;

  // Determine final status
  let finalStatus: CompletionSummary['finalStatus'];
  if (completedCount === totalChecklistItems && unresolvedIssues.length === 0) {
    finalStatus = 'complete';
  } else if (completedCount > 0) {
    finalStatus = 'partial_complete';
  } else {
    finalStatus = 'failed';
  }

  // Build notes
  const notes: string[] = [];
  if (finalStatus === 'complete') {
    notes.push('All checklist items completed successfully.');
  } else {
    notes.push(`${completedCount}/${totalChecklistItems} checklist items completed.`);
    if (unresolvedIssues.length > 0) {
      notes.push(`${unresolvedIssues.length} unresolved issue(s) remain.`);
    }
    const pendingItems = workspace.checklist.filter((i) => i.status !== 'done');
    if (pendingItems.length > 0) {
      notes.push(`Pending items: ${pendingItems.map((i) => i.label).join(', ')}`);
    }
  }
  notes.push(`Completed in ${run.iteration} iteration(s).`);

  return {
    totalChecklistItems,
    completedItems,
    unresolvedIssues,
    totalIterations: run.iteration,
    duration,
    finalStatus,
    notes: notes.join(' '),
  };
}
