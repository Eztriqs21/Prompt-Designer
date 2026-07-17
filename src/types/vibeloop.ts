// ─── VibeLoop Types ────────────────────────────────────────
// Canonical type definitions for the VibeLoop automation system.
// Used by both frontend and backend.

// ─── Workspace ─────────────────────────────────────────────

export type WorkspaceStatus = 'active' | 'revoked' | 'completed';

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
}

export interface CreateWorkspacePayload {
  projectName: string;
  objective: string;
  checklist: Omit<ChecklistItem, 'id' | 'status'>[];
  constraints?: string[];
  referenceNotes?: string;
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
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Run ───────────────────────────────────────────────────

export type RunStage =
  | 'draft'
  | 'planning'
  | 'planned'
  | 'building'
  | 'awaiting_agent_completion'
  | 'maybe_done'
  | 'context_compacted'
  | 'auditing'
  | 'needs_fix'
  | 'continuing'
  | 'complete'
  | 'partial_complete'
  | 'failed'
  | 'stopped';

export type RunStatus = 'running' | 'paused' | 'completed' | 'failed' | 'stopped';

export interface RunEvent {
  id: string;
  runId: string;
  stage: RunStage;
  type: 'info' | 'prompt_sent' | 'result_received' | 'audit_complete' | 'error' | 'state_change';
  data: Record<string, unknown>;
  timestamp: string;
}

export interface Run {
  id: string;
  workspaceId: string;
  status: RunStatus;
  stage: RunStage;
  iteration: number;
  maxIterations: number;
  latestPrompt?: string;
  latestResponse?: AgentResponse;
  latestAudit?: AuditResult;
  plan?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  stoppedAt?: string;
}

// ─── Agent Communication ───────────────────────────────────

export interface AgentResponse {
  message: string;
  diffSummary?: string;
  filesTouched?: string[];
  commandsRun?: string[];
  testResults?: string;
  errorsFound?: string[];
  suggestedFixes?: string[];
  done?: boolean;
  compacted?: boolean;
}

export interface SubmitResultPayload {
  message: string;
  diffSummary?: string;
  filesTouched?: string[];
  commandsRun?: string[];
  testResults?: string;
  errorsFound?: string[];
  suggestedFixes?: string[];
  done?: boolean;
  compacted?: boolean;
}

// ─── Audit ─────────────────────────────────────────────────

export type AuditStatus = 'pass' | 'pass_with_notes' | 'needs_fix' | 'blocked';

export interface Issue {
  id: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  category: string;
  description: string;
  suggestion?: string;
  fixable: boolean;
}

export interface ChecklistCoverageEntry {
  itemId: string;
  label: string;
  covered: boolean;
  notes?: string;
}

export interface AuditResult {
  status: AuditStatus;
  summary: string;
  issues: Issue[];
  checklistCoverage: ChecklistCoverageEntry[];
  regressionDetected: boolean;
}

// ─── Prompt ────────────────────────────────────────────────

export type PromptMode = 'blueprint' | 'build' | 'audit' | 'fix' | 'summary';

export interface PromptPayload {
  mode: PromptMode;
  content: string;
  workspaceId: string;
  runId: string;
  iteration: number;
}

// ─── Completion ────────────────────────────────────────────

export type CompletionStatus = 'complete' | 'partial_complete' | 'failed';

export interface CompletionSummary {
  status: CompletionStatus;
  totalItems: number;
  completedItems: number;
  unresolvedIssues: number;
  iterations: number;
  duration: string;
  completedChecklistItems: string[];
  unresolvedIssueList: Issue[];
  notes: string;
}

// ─── Config ────────────────────────────────────────────────

export interface VibeLoopConfig {
  maxIterations: number;
  staleRunTimeoutMs: number;
  resultTimeoutMs: number;
}
