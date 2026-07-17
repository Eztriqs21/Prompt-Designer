import type { Workspace, Run } from '../../src/types/vibeloop.js';

export function buildBuildPrompt(
  workspace: Workspace,
  run: Run,
  plan: string
): string {
  const pendingItems = workspace.checklist.filter((item) => item.status === 'pending');
  const checklist = pendingItems
    .map((item) => `- [ ] ${item.label}: ${item.description}`)
    .join('\n');

  const doneItems = workspace.checklist.filter((item) => item.status === 'done');
  const completedContext = doneItems.length > 0
    ? `\n## Already Completed\n${doneItems.map((i) => `- [x] ${i.label}`).join('\n')}`
    : '';

  return `# VibeLoop Build Mode

You are in **Build Mode**. Your task is to implement the next phase of the project.

## Project: ${workspace.projectName}

### Current Iteration: ${run.iteration}

### Implementation Plan
${plan || 'No plan available. Implement based on the objective and checklist.'}

### Pending Checklist Items
${checklist || 'All items completed'}
${completedContext}

### Objective
${workspace.objective}

## Instructions

1. **Implement the next logical phase** from the plan
2. **Focus on the highest priority pending items** first
3. **Make incremental progress** - don't try to do everything at once
4. **Output DONE only when** the current build task is fully complete
5. **Be explicit about what was done** in your response

## Response Format

When you complete the task, output your response in this structure:

### What was implemented
- [List of changes made]

### Files modified
- [List of files changed]

### Verification
- [How to verify the changes work]

### Status
- DONE (only if the current task is fully complete)
- NOT_DONE (if more work is needed)

## Important

- Output \`DONE\` only when the assigned work is truly complete
- Keep output structured and clear
- Include all files touched
- Report any errors or issues encountered`;
}
