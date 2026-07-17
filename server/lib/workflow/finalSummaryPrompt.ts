import type { Workspace, Run, AuditResult, CompletionSummary } from '../../src/types/vibeloop.js';

export function buildFinalSummaryPrompt(
  workspace: Workspace,
  run: Run,
  allAudits: AuditResult[],
  summary: CompletionSummary
): string {
  const completedItems = workspace.checklist
    .filter((item) => item.status === 'done')
    .map((item) => `- [x] ${item.label}: ${item.description}`)
    .join('\n');

  const pendingItems = workspace.checklist
    .filter((item) => item.status !== 'done')
    .map((item) => `- [ ] ${item.label}: ${item.description}`)
    .join('\n');

  const allIssues = allAudits.flatMap((audit) => audit.issues);
  const unresolvedIssues = allIssues.filter(
    (issue) => issue.severity === 'critical' || issue.severity === 'major'
  );

  return `# VibeLoop Final Summary

You are generating the completion summary for the VibeLoop automation run.

## Project: ${workspace.projectName}

### Objective
${workspace.objective}

### Run Statistics
- Total Iterations: ${run.iteration}
- Duration: ${summary.duration}
- Final Status: ${summary.status}

### Completed Items
${completedItems || 'None completed'}

### Pending Items
${pendingItems || 'All items completed'}

### Unresolved Issues
${unresolvedIssues.length > 0
    ? unresolvedIssues.map((i) => `- ${i.severity}: ${i.description}`).join('\n')
    : 'None'}

## Summary Task

Generate a comprehensive final summary that includes:

1. **Completion Status** - Overall success level
2. **Work Completed** - What was achieved
3. **Remaining Work** - What still needs to be done
4. **Issues Summary** - Key problems encountered
5. **Recommendations** - Next steps for the user

## Format

Output the summary in a clear, human-readable format that the user can understand and act upon.`;
}
