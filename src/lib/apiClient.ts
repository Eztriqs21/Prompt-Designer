import type { MasterPromptRequest, MasterPromptResponse, SavedPrompt, ChatSession, PromptVersion, SectionType, SectionPromptRequest, SectionPromptResponse, Message } from '../types';

export interface SectionMessage {
  id: string;
  chatId: string;
  sectionType: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// ─── Prompts ───────────────────────────────────────────────

export async function generateMasterPrompt(data: MasterPromptRequest): Promise<MasterPromptResponse> {
  const res = await fetch(`${API_BASE}/master-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const message = err?.details || err?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return res.json();
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
  data: SectionPromptRequest
): Promise<SectionPromptResponse> {
  const res = await fetch(`${API_BASE}/sections/${sectionType}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const message = err?.details || err?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return res.json();
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
