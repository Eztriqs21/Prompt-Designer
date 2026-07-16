// ─── Workspace ──────────────────────────────────────────────

export type WorkspaceStatus = 'draft' | 'ready' | 'connected' | 'active';

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
}

export interface Workspace {
  id: string;
  key: string;
  projectName: string;
  objective: string;
  checklist: ChecklistItem[];
  constraints: string[];
  referenceNotes: string;
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
  connectedAt?: string;
  revokedAt?: string;
}

export interface CreateWorkspacePayload {
  projectName: string;
  objective: string;
  checklist: Omit<ChecklistItem, 'id' | 'status'>[];
  constraints: string[];
  referenceNotes: string;
}

// ─── Run ────────────────────────────────────────────────────

export type RunStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped';

export type WorkflowStage =
  | 'initial_implementation'
  | 'agent_executing'
  | 'awaiting_result'
  | 'auditing'
  | 'needs_fix'
  | 'generating_fix_prompt'
  | 'continuing'
  | 'final_summary'
  | 'complete';

export interface Run {
  id: string;
  workspaceId: string;
  status: RunStatus;
  iteration: number;
  stage: WorkflowStage;
  latestPrompt: string;
  latestResponse: AgentResponse | null;
  latestAudit: AuditResult | null;
  unresolvedIssues: Issue[];
  completedItems: string[];
  events: RunEvent[];
  startedAt: string;
  endedAt?: string;
}

export interface RunEvent {
  timestamp: string;
  stage: WorkflowStage;
  type: 'prompt_sent' | 'result_received' | 'audit_complete' | 'fix_generated' | 'stage_change' | 'error' | 'started' | 'stopped';
  data: Record<string, unknown>;
}

// ─── Agent Communication ────────────────────────────────────

export interface AgentResponse {
  message: string;
  diffSummary: string;
  filesTouched: string[];
  commandsRun: string[];
  testResults: string;
  errorsFound: string[];
  suggestedFixes: string[];
}

export interface SubmitResultPayload {
  message: string;
  diffSummary?: string;
  filesTouched?: string[];
  commandsRun?: string[];
  testResults?: string;
  errorsFound?: string[];
  suggestedFixes?: string[];
}

// ─── Audit ──────────────────────────────────────────────────

export type VibeLoopAuditStatus = 'pass' | 'pass_with_notes' | 'needs_fix' | 'blocked';

export interface Issue {
  id: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  category: string;
  description: string;
  suggestion: string;
  fixable: boolean;
}

export interface AuditResult {
  status: VibeLoopAuditStatus;
  issues: Issue[];
  summary: string;
  checklistCoverage: ChecklistCoverageEntry[];
}

export interface ChecklistCoverageEntry {
  itemId: string;
  covered: boolean;
  notes: string;
}

// ─── Prompt Payload ─────────────────────────────────────────

export interface PromptPayload {
  objective: string;
  checklist: ChecklistItem[];
  constraints: string[];
  referenceNotes: string;
  stage: WorkflowStage;
  iteration: number;
  lastResponse: AgentResponse | null;
  lastAudit: AuditResult | null;
  unresolvedIssues: Issue[];
  nextAction: string;
}

// ─── Summary ────────────────────────────────────────────────

export interface CompletionSummary {
  totalChecklistItems: number;
  completedItems: { id: string; label: string }[];
  unresolvedIssues: Issue[];
  totalIterations: number;
  duration: string;
  finalStatus: 'complete' | 'partial_complete' | 'failed';
  notes: string;
}
