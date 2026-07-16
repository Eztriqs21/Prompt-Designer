export interface ChatSession {
  id: string;
  title: string;
  isDefaultTitle?: boolean;
  presetKey?: string;
  metadata?: {
    websiteType?: string;
    audience?: string;
    goal?: string;
    preferredStack?: string;
    style?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface NewChatFormValues {
  title: string;
  websiteType: string;
  audience: string;
  goal: string;
  preferredStack: string;
  style: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface MasterPromptRequest {
  chatId?: string;
  presetKey?: string;
  metadata?: {
    websiteType?: string;
    audience?: string;
    goal?: string;
    preferredStack?: string;
    style?: string;
  };
  idea: string;
  conversationHistory: Message[];
  requestId?: string;
}

export type AttemptStatus = 'success' | 'failed' | 'aborted' | 'timeout';

export interface AttemptMeta {
  model: string;
  status: AttemptStatus;
  durationMs?: number;
  error?: string;
}

export interface MasterPromptResponse {
  id: string;
  chatId?: string;
  promptId?: string | null;
  version?: number | null;
  isPinned?: boolean | null;
  summary: string;
  analysis: string;
  masterPrompt: string;
  timestamp: number;
  remaining?: number;
  meta?: { model?: string; attempts: AttemptMeta[] };
}

export interface SavedPrompt {
  id: string;
  chatId?: string;
  title: string;
  summary: string;
  masterPrompt: string;
  timestamp: number;
}

export interface PromptVersion {
  id: string;
  chatId: string;
  version: number;
  title: string;
  summary: string;
  analysis: string;
  masterPrompt: string;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
}

// ─── Section Prompts ──────────────────────────────────────

export type SectionType = 'coding' | 'ui-ux' | 'audit';

export interface SectionPromptRequest {
  chatId: string;
  masterPrompt: string;
  userRequest?: string;
  conversationHistory: Message[];
  requestId?: string;
}

export interface SectionPromptResponse {
  summary: string;
  analysis: string;
  masterPrompt: string;
  meta?: { model?: string; attempts: AttemptMeta[] };
}

export interface SectionState {
  isGenerating: boolean;
  data: SectionPromptResponse | null;
  error: string | null;
}

// ─── Website AUDIT Types ───────────────────────────────────

export type AuditInputType = 'url' | 'github' | 'files' | 'bundle';
export type AuditMode = 'basic' | 'recommended' | 'full';
export type AuditStatus =
  | 'queued'
  | 'ingesting'
  | 'analyzing'
  | 'testing'
  | 'accessibility'
  | 'collecting'
  | 'summarizing'
  | 'complete'
  | 'failed';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingCategory = 'bug' | 'loophole' | 'ux' | 'security' | 'accessibility' | 'performance' | 'code-quality';

export interface AuditFinding {
  id: string;
  severity: Severity;
  category: FindingCategory;
  title: string;
  description: string;
  file?: string;
  line?: number;
  evidence?: string;
  fix?: string;
  confidence: number;
}

export interface AuditEvidence {
  id: string;
  type: 'screenshot' | 'console-log' | 'network-error' | 'trace' | 'dom-snapshot';
  jobStage: string;
  filePath: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface AuditReport {
  summary: string;
  score: number;
  severityCounts: Record<Severity, number>;
  findings: AuditFinding[];
  codeIssues: AuditFinding[];
  browserIssues: AuditFinding[];
  accessibilityIssues: AuditFinding[];
  performanceIssues: AuditFinding[];
  recommendations: string[];
  evidence: AuditEvidence[];
  fixPrompt: string;
  generatedBy?: string;
}

export interface AuditJobStages {
  ingesting: { status: string; startedAt?: number; completedAt?: number };
  analyzing: { status: string; startedAt?: number; completedAt?: number };
  testing: { status: string; startedAt?: number; completedAt?: number };
  accessibility: { status: string; startedAt?: number; completedAt?: number };
  collecting: { status: string; startedAt?: number; completedAt?: number };
  summarizing: { status: string; startedAt?: number; completedAt?: number };
}

export interface AuditJob {
  id: string;
  inputType: AuditInputType;
  source: string;
  workspacePath: string;
  mode: AuditMode;
  status: AuditStatus;
  progress: number;
  stages: AuditJobStages;
  findings: AuditFinding[];
  evidence: AuditEvidence[];
  report: AuditReport | null;
  error?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}
