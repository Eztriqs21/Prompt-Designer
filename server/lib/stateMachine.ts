import type { WorkflowStage } from '../src/types/vibeloop.js';

interface Transition {
  from: WorkflowStage;
  to: WorkflowStage;
  trigger: string;
}

const VALID_TRANSITIONS: Transition[] = [
  { from: 'initial_implementation', to: 'agent_executing', trigger: 'start' },
  { from: 'agent_executing', to: 'awaiting_result', trigger: 'prompt_sent' },
  { from: 'awaiting_result', to: 'auditing', trigger: 'result_received' },
  { from: 'auditing', to: 'needs_fix', trigger: 'has_fixable_issues' },
  { from: 'auditing', to: 'complete', trigger: 'all_done' },
  { from: 'auditing', to: 'final_summary', trigger: 'no_more_progress' },
  { from: 'needs_fix', to: 'generating_fix_prompt', trigger: 'fix_needed' },
  { from: 'generating_fix_prompt', to: 'agent_executing', trigger: 'prompt_sent' },
  { from: 'final_summary', to: 'complete', trigger: 'summary_generated' },
];

export function canTransition(from: WorkflowStage, trigger: string): boolean {
  return VALID_TRANSITIONS.some((t) => t.from === from && t.trigger === trigger);
}

export function nextStage(current: WorkflowStage, trigger: string): WorkflowStage {
  const transition = VALID_TRANSITIONS.find((t) => t.from === current && t.trigger === trigger);
  if (!transition) {
    throw new Error(`Invalid transition: ${current} + ${trigger}`);
  }
  return transition.to;
}

export function getValidTriggers(stage: WorkflowStage): string[] {
  return VALID_TRANSITIONS.filter((t) => t.from === stage).map((t) => t.trigger);
}
