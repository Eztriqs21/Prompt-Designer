import type { MasterPromptRequest, MasterPromptResponse, SavedPrompt, ChatSession, PromptVersion, SectionType, SectionPromptRequest, SectionPromptResponse, Message, AuditInputType, AuditMode, AuditStatus, AuditReport, AuditJobStages } from '../types';

export interface SectionMessage {
  id: string;
  chatId: string;
  sectionType: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Normalize the API base so a custom (production) base always ends in `/api`.
// Dev: VITE_API_BASE is unset -> '/api' (Vite proxies to the backend).
// Prod: VITE_API_BASE='https://x.onrender.com' -> 'https://x.onrender.com/api'.
// Prod: VITE_API_BASE='https://x.onrender.com/api' -> unchanged.
const rawApiBase = import.meta.env.VITE_API_BASE || '/api';
const API_BASE = rawApiBase.endsWith('/api')
  ? rawApiBase
  : `${rawApiBase.replace(/\/$/, '')}/api`;

// ─── Prompts ───────────────────────────────────────────────

export async function generateMasterPrompt(
  data: MasterPromptRequest,
  signal?: AbortSignal,
): Promise<MasterPromptResponse> {
  // Correlation id so one generation can be traced frontend → backend.
  const clientReqId = data.requestId || `fe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = { ...data, requestId: clientReqId };
  const res = await fetch(`${API_BASE}/master-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const code = err?.code || 'UNKNOWN_ERROR';
    const message = err?.error || `Request failed with status ${res.status}`;
    const error = new Error(message) as Error & { code?: string; remaining?: number };
    error.code = code;
    error.remaining = err?.remaining;
    throw error;
  }

  const json = await res.json();
  return json;
}

export async function getPrompts(): Promise<SavedPrompt[]> {
  const res = await fetch(`${API_BASE}/prompts`);
  if (!res.ok) throw new Error('Failed to fetch prompts');
  return res.json();
}

export async function getPromptById(id: string): Promise<SavedPrompt> {
  const res = await fetch(`${API_BASE}/prompts/${id}`);
  if (!res.ok) throw new Error('Prompt not found');
  return res.json();
}

export async function deletePrompt(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/prompts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete prompt');
}

// ─── Chats ─────────────────────────────────────────────────

export async function getChats(): Promise<ChatSession[]> {
  const res = await fetch(`${API_BASE}/chats`);
  if (!res.ok) throw new Error('Failed to fetch chats');
  return res.json();
}

export async function createChat(data: {
  title: string;
  isDefaultTitle?: boolean;
  presetKey?: string;
  metadata?: ChatSession['metadata'];
}): Promise<ChatSession> {
  const res = await fetch(`${API_BASE}/chats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create chat');
  return res.json();
}

export async function getChat(chatId: string): Promise<
  ChatSession & {
    messages: Message[];
    lastPrompt: SavedPrompt | null;
  }
> {
  const res = await fetch(`${API_BASE}/chats/${chatId}`);
  if (!res.ok) throw new Error('Chat not found');
  return res.json();
}

export async function deleteChat(chatId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete chat');
}

export async function renameChat(chatId: string, title: string): Promise<ChatSession> {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to rename chat');
  return res.json();
}

export async function saveChatMessage(
  chatId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<Message> {
  const res = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content }),
  });
  if (!res.ok) throw new Error('Failed to save message');
  return res.json();
}

// ─── Prompt Versions ─────────────────────────────────────

export async function getPromptVersions(chatId: string): Promise<PromptVersion[]> {
  const res = await fetch(`${API_BASE}/chats/${chatId}/prompts`);
  if (!res.ok) throw new Error('Failed to fetch prompt versions');
  return res.json();
}

export async function pinPromptVersion(chatId: string, promptId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chats/${chatId}/prompts/${promptId}/pin`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to pin prompt');
}

export async function clonePromptVersion(
  sourcePromptId: string,
  newChatTitle?: string
): Promise<{ newChatId: string; prompt: PromptVersion }> {
  const res = await fetch(`${API_BASE}/prompt/clone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourcePromptId, newChatTitle }),
  });
  if (!res.ok) throw new Error('Failed to clone prompt');
  return res.json();
}

// ─── Section Prompts ─────────────────────────────────────

export async function generateSectionPrompt(
  sectionType: SectionType,
  data: SectionPromptRequest,
  signal?: AbortSignal,
): Promise<SectionPromptResponse> {
  const clientReqId = data.requestId || `fe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = { ...data, requestId: clientReqId };
  const res = await fetch(`${API_BASE}/sections/${sectionType}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const message = err?.details || err?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  const json = await res.json();
  return json;
}

// ─── Section Messages ─────────────────────────────────────

export async function getSectionMessages(chatId: string, sectionType: string): Promise<SectionMessage[]> {
  const res = await fetch(`${API_BASE}/section-messages/${chatId}/${sectionType}`);
  if (!res.ok) throw new Error('Failed to fetch section messages');
  return res.json();
}

export async function saveSectionMessage(
  chatId: string,
  sectionType: string,
  role: 'user' | 'assistant',
  content: string
): Promise<SectionMessage> {
  const res = await fetch(`${API_BASE}/section-messages/${chatId}/${sectionType}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content }),
  });
  if (!res.ok) throw new Error('Failed to save section message');
  return res.json();
}

// ─── Website AUDIT ─────────────────────────────────────────

export interface AuditJobSummary {
  id: string;
  inputType: AuditInputType;
  source: string;
  mode: AuditMode;
  status: AuditStatus;
  progress: number;
  createdAt: number;
  completedAt?: number;
}

export interface AuditJobStatus {
  id: string;
  inputType: AuditInputType;
  source: string;
  mode: AuditMode;
  status: AuditStatus;
  progress: number;
  stages: AuditJobStages;
  error?: string;
  partial?: boolean;
  findings?: any[];
  evidence?: any[];
  report?: AuditReport | null;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface AuditJobReport {
  id: string;
  inputType: AuditInputType;
  source: string;
  mode: AuditMode;
  status: AuditStatus;
  report: AuditReport;
  completedAt?: number;
}

export async function createAuditJob(data: {
  inputType: AuditInputType;
  source: string;
  mode: AuditMode;
  files?: File[];
}): Promise<{ id: string; inputType: string; source: string; mode: string; status: string; progress: number; createdAt: number; remaining: number }> {
  const formData = new FormData();
  formData.append('inputType', data.inputType);
  formData.append('source', data.source);
  formData.append('mode', data.mode);
  if (data.files) {
    for (const file of data.files) {
      formData.append('files', file);
    }
  }

  const res = await fetch(`${API_BASE}/audit`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const message = err?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return res.json();
}

export async function getAuditJob(jobId: string): Promise<AuditJobStatus> {
  const res = await fetch(`${API_BASE}/audit/${jobId}`);
  if (!res.ok) throw new Error('Audit job not found');
  return res.json();
}

export async function getAuditReport(jobId: string): Promise<AuditJobReport> {
  const res = await fetch(`${API_BASE}/audit/${jobId}/report`);
  if (res.status === 202) {
    // Report not ready yet
    const data = await res.json();
    throw new Error(data.error || 'Report not ready');
  }
  if (!res.ok) throw new Error('Failed to fetch audit report');
  return res.json();
}

export async function getAuditEvidence(jobId: string, evidenceId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/audit/${jobId}/evidence/${evidenceId}`);
  if (!res.ok) throw new Error('Evidence not found');
  return res.json();
}

export async function listAuditJobs(): Promise<AuditJobSummary[]> {
  const res = await fetch(`${API_BASE}/audit`);
  if (!res.ok) throw new Error('Failed to fetch audit jobs');
  return res.json();
}

export async function deleteAuditJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/audit/${jobId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete audit job');
}

// ─── VibeLoop ─────────────────────────────────────────────

import type {
  Workspace,
  CreateWorkspacePayload,
  Run,
  RunEvent,
  CompletionSummary,
} from '../types/vibeloop';

export async function createWorkspace(data: CreateWorkspacePayload): Promise<Workspace> {
  const res = await fetch(`${API_BASE}/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create workspace');
  return res.json();
}

export async function getWorkspace(id: string): Promise<Workspace> {
  const res = await fetch(`${API_BASE}/workspaces/${id}`);
  if (!res.ok) throw new Error('Workspace not found');
  return res.json();
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const res = await fetch(`${API_BASE}/workspaces`);
  if (!res.ok) throw new Error('Failed to fetch workspaces');
  return res.json();
}

export async function updateWorkspace(id: string, patch: Partial<Workspace>): Promise<Workspace> {
  const res = await fetch(`${API_BASE}/workspaces/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Failed to update workspace');
  return res.json();
}

export async function deleteWorkspace(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/workspaces/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete workspace');
}

export async function revokeWorkspaceKey(id: string): Promise<Workspace> {
  const res = await fetch(`${API_BASE}/workspaces/${id}/revoke`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to revoke key');
  return res.json();
}

export async function startRun(workspaceId: string): Promise<Run> {
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/run`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to start run');
  return res.json();
}

export async function stopRun(workspaceId: string): Promise<Run> {
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/stop`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to stop run');
  return res.json();
}

export async function getRun(runId: string): Promise<Run> {
  const res = await fetch(`${API_BASE}/runs/${runId}`);
  if (!res.ok) throw new Error('Run not found');
  return res.json();
}

export async function getRunEvents(runId: string): Promise<RunEvent[]> {
  const res = await fetch(`${API_BASE}/runs/${runId}/events`);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function getRunSummary(runId: string): Promise<CompletionSummary> {
  const res = await fetch(`${API_BASE}/runs/${runId}/summary`);
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}

export async function getRunHistory(workspaceId: string): Promise<Run[]> {
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/history`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function getRunFull(runId: string): Promise<{ run: Run; workspace: any }> {
  const res = await fetch(`${API_BASE}/runs/${runId}/full`);
  if (!res.ok) throw new Error('Failed to fetch run details');
  return res.json();
}
