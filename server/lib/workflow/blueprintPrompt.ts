import type { Workspace, Run } from '../../src/types/vibeloop.js';

export function buildBlueprintPrompt(workspace: Workspace, run: Run): string {
  const checklist = workspace.checklist
    .map((item) => `- [ ] ${item.label}: ${item.description} (priority: ${item.priority})`)
    .join('\n');

  const constraints = workspace.constraints.length > 0
    ? workspace.constraints.map((c) => `- ${c}`).join('\n')
    : 'None specified';

  return `# VibeLoop Blueprint Mode

You are in **Plan Mode**. Your task is to analyze the project and produce a comprehensive implementation blueprint.

## Project: ${workspace.projectName}

### Objective
${workspace.objective}

### Feature Checklist
${checklist}

### Constraints
${constraints}

### Reference Notes
${workspace.referenceNotes || 'None provided'}

## Required Output

Produce a structured implementation plan with:

1. **Project Summary** - Brief overview of what needs to be built
2. **Architecture** - High-level design decisions and patterns
3. **Implementation Phases** - Ordered list of work phases
4. **File-by-File Plan** - List of files to create or modify
5. **Backend Changes** - API or server-side work needed
6. **Frontend Changes** - UI or client-side work needed
7. **Dependencies** - External libraries or services required
8. **Risks** - Potential blockers or challenges
9. **Completion Criteria** - How to verify each phase is complete
10. **Checklist Mapping** - Which phases address which checklist items

## Format

Output the plan in a clear, structured format that can be used as a contract for the build phase. Each phase should be self-contained and verifiable.

## Important

- This is a planning pass only. Do not write any code.
- Focus on creating a durable plan that a fresh agent can execute.
- Identify all dependencies and risks upfront.
- Map each checklist item to specific implementation phases.`;
}
