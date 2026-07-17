import type { RunStage } from '../../src/types/vibeloop.js';

interface Transition {
  from: RunStage;
  to: RunStage;
  trigger: string;
}

const VALID_TRANSITIONS: Transition[] = [
  // Start flow
  { from: 'draft', to: 'planning', trigger: 'start' },
  { from: 'planning', to: 'planned', trigger: 'plan_received' },
  { from: 'planned', to: 'building', trigger: 'start_build' },

  // Build flow
  { from: 'building', to: 'awaiting_agent_completion', trigger: 'prompt_sent' },
  { from: 'awaiting_agent_completion', to: 'maybe_done', trigger: 'agent_done_signal' },
  { from: 'awaiting_agent_completion', to: 'context_compacted', trigger: 'compaction_detected' },

  // Audit flow
  { from: 'maybe_done', to: 'auditing', trigger: 'audit_start' },
  { from: 'context_compacted', to: 'auditing', trigger: 'audit_start' },

  // Post-audit decisions
  { from: 'auditing', to: 'complete', trigger: 'all_clear' },
  { from: 'auditing', to: 'partial_complete', trigger: 'partial_done' },
  { from: 'auditing', to: 'needs_fix', trigger: 'fix_required' },
  { from: 'auditing', to: 'continuing', trigger: 'more_work_needed' },

  // Fix/continue loop
  { from: 'needs_fix', to: 'building', trigger: 'fix_prompt_sent' },
  { from: 'continuing', to: 'building', trigger: 'next_prompt_sent' },

  // Direct completion (no audit needed)
  { from: 'awaiting_agent_completion', to: 'complete', trigger: 'direct_complete' },

  // Stop/fail from any non-terminal state
  { from: 'draft', to: 'stopped', trigger: 'stop' },
  { from: 'planning', to: 'stopped', trigger: 'stop' },
  { from: 'planned', to: 'stopped', trigger: 'stop' },
  { from: 'building', to: 'stopped', trigger: 'stop' },
  { from: 'awaiting_agent_completion', to: 'stopped', trigger: 'stop' },
  { from: 'maybe_done', to: 'stopped', trigger: 'stop' },
  { from: 'context_compacted', to: 'stopped', trigger: 'stop' },
  { from: 'auditing', to: 'stopped', trigger: 'stop' },
  { from: 'needs_fix', to: 'stopped', trigger: 'stop' },
  { from: 'continuing', to: 'stopped', trigger: 'stop' },

  // Fail from any non-terminal state
  { from: 'draft', to: 'failed', trigger: 'fail' },
  { from: 'planning', to: 'failed', trigger: 'fail' },
  { from: 'planned', to: 'failed', trigger: 'fail' },
  { from: 'building', to: 'failed', trigger: 'fail' },
  { from: 'awaiting_agent_completion', to: 'failed', trigger: 'fail' },
  { from: 'maybe_done', to: 'failed', trigger: 'fail' },
  { from: 'context_compacted', to: 'failed', trigger: 'fail' },
  { from: 'auditing', to: 'failed', trigger: 'fail' },
  { from: 'needs_fix', to: 'failed', trigger: 'fail' },
  { from: 'continuing', to: 'failed', trigger: 'fail' },
];

const TERMINAL_STATES: RunStage[] = ['complete', 'partial_complete', 'failed', 'stopped'];

export function canTransition(from: RunStage, trigger: string): boolean {
  return VALID_TRANSITIONS.some((t) => t.from === from && t.trigger === trigger);
}

export function nextStage(current: RunStage, trigger: string): RunStage {
  const transition = VALID_TRANSITIONS.find(
    (t) => t.from === current && t.trigger === trigger
  );
  if (!transition) {
    throw new Error(`Invalid transition: ${current} + ${trigger}`);
  }
  return transition.to;
}

export function isTerminal(stage: RunStage): boolean {
  return TERMINAL_STATES.includes(stage);
}

export function getValidTriggers(stage: RunStage): string[] {
  return VALID_TRANSITIONS.filter((t) => t.from === stage).map((t) => t.trigger);
}
