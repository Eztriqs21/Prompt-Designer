import type { Workspace, Run, Issue, PromptPayload, WorkflowStage } from '../../src/types/vibeloop.js';

function formatChecklist(checklist: Workspace['checklist']): string {
  return checklist
    .map((item) => `- [${item.status === 'done' ? 'x' : ' '}] ${item.label} (${item.priority})${item.description ? ': ' + item.description : ''}`)
    .join('\n');
}

function formatIssues(issues: Issue[]): string {
  if (issues.length === 0) return 'None';
  return issues
    .map((i) => `- [${i.severity}] ${i.description}${i.suggestion ? ' → ' + i.suggestion : ''}`)
    .join('\n');
}

export function buildInitialPrompt(workspace: Workspace): string {
  return `# Implementation Task

## Project Objective
${workspace.objective}

## Feature Checklist
${formatChecklist(workspace.checklist)}

## Constraints
${workspace.constraints.length > 0 ? workspace.constraints.map((c) => `- ${c}`).join('\n') : 'None specified'}

## Reference Notes
${workspace.referenceNotes || 'None'}

## Instructions
Implement the features listed in the checklist above. Work through each item systematically.
For each change you make, report:
1. What you implemented
2. Which files you touched
3. Any commands you ran
4. Any errors encountered
5. Any issues that need attention

Focus on completing all checklist items. When done, submit your result.`;
}

export function buildFixPrompt(workspace: Workspace, run: Run, issues: Issue[]): string {
  const fixableIssues = issues.filter((i) => i.fixable);

  return `# Fix Cycle — Iteration ${run.iteration}

## Project Objective
${workspace.objective}

## Current Status
- Completed items: ${run.completedItems.length}/${workspace.checklist.length}
- Current iteration: ${run.iteration}

## Features Still Needed
${formatChecklist(workspace.checklist.filter((item) => item.status !== 'done'))}

## Issues to Fix
${formatIssues(fixableIssues)}

## Previous Response Summary
${run.latestResponse ? run.latestResponse.message.slice(0, 500) : 'N/A'}

## Previous Errors
${run.latestResponse?.errorsFound?.length ? run.latestResponse.errorsFound.join('\n') : 'None'}

## Instructions
Fix the issues listed above. Focus on the fixable issues.
For each fix, report what you changed and whether it resolves the issue.
If an issue cannot be fixed, explain why.

When done, submit your result.`;
}

export function buildAuditPrompt(workspace: Workspace, run: Run): string {
  return `# Audit Task

## Project Objective
${workspace.objective}

## Checklist Items to Verify
${formatChecklist(workspace.checklist)}

## Latest Implementation
${run.latestResponse?.message?.slice(0, 1000) || 'No response yet'}

## Files Changed
${run.latestResponse?.filesTouched?.join(', ') || 'None reported'}

## Commands Run
${run.latestResponse?.commandsRun?.join('\n') || 'None reported'}

## Test Results
${run.latestResponse?.testResults || 'Not available'}

## Instructions
Evaluate the latest implementation against the checklist.
For each item, determine if it is properly implemented.
Report any issues, regressions, or missing features.`;
}

export function buildFinalSummaryPrompt(workspace: Workspace, run: Run): string {
  return `# Final Summary

## Project Objective
${workspace.objective}

## Completed Items
${run.completedItems.length > 0
    ? workspace.checklist.filter((i) => run.completedItems.includes(i.id)).map((i) => `- [x] ${i.label}`).join('\n')
    : 'None completed'}

## Unresolved Issues
${formatIssues(run.unresolvedIssues)}

## Total Iterations: ${run.iteration}

## Instructions
Provide a final summary of what was accomplished and what remains unresolved.
Be concise and specific.`;
}

export function buildPromptForStage(
  stage: WorkflowStage,
  workspace: Workspace,
  run: Run,
  issues: Issue[] = []
): string {
  switch (stage) {
    case 'initial_implementation':
      return buildInitialPrompt(workspace);
    case 'generating_fix_prompt':
      return buildFixPrompt(workspace, run, issues);
    case 'final_summary':
      return buildFinalSummaryPrompt(workspace, run);
    default:
      return buildInitialPrompt(workspace);
  }
}
