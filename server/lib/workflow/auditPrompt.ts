import type { Workspace, Run, AuditResult } from '../../src/types/vibeloop.js';

export function buildAuditPrompt(
  workspace: Workspace,
  run: Run,
  agentResponse: string,
  previousAudit?: AuditResult
): string {
  const checklist = workspace.checklist
    .map((item) => {
      const status = item.status === 'done' ? 'DONE' : 'PENDING';
      return `- [${item.status === 'done' ? 'x' : ' '}] ${item.label} (${status})`;
    })
    .join('\n');

  const previousIssues = previousAudit && previousAudit.issues.length > 0
    ? `\n## Previous Issues (must not regress)\n${previousAudit.issues.map((i) => `- ${i.severity}: ${i.description}`).join('\n')}`
    : '';

  return `# VibeLoop Audit Mode

You are in **Audit Mode**. Your task is to validate the agent's implementation and decide the next action.

## Project: ${workspace.projectName}

### Current Iteration: ${run.iteration}

### Agent Response
${agentResponse}

### Checklist Status
${checklist}
${previousIssues}

## Audit Tasks

1. **Verify Implementation** - Check if the agent's work is correct
2. **Check Coverage** - Ensure all requested items were addressed
3. **Classify Issues** - Categorize any problems found
4. **Detect Regressions** - Check if previously fixed issues reappeared
5. **Decide Next Action** - Determine if we should continue, fix, or complete

## Issue Classification

- **Critical**: Blocks completion, must be fixed immediately
- **Major**: Significant problem that needs fixing
- **Minor**: Small issue, can be addressed later
- **Info**: Observation, not necessarily a problem

## Response Format

Output your audit in this structure:

### Status
- PASS: All good, ready to continue or complete
- PASS_WITH_NOTES: Mostly good, minor issues noted
- NEEDS_FIX: Significant issues found, needs fixing
- BLOCKED: Critical issues, cannot proceed

### Summary
- [Brief summary of audit findings]

### Issues Found
- [List of issues with severity and description]

### Checklist Coverage
- [Which items were covered, which were missed]

### Recommendation
- [Continue / Fix / Complete]

## Important

- Be thorough but fair
- Focus on correctness and completeness
- Don't be overly strict on minor issues
- Consider the overall progress toward the objective`;
}
