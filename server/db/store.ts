import { v4 as uuidv4 } from 'uuid';
import type { SavedPrompt } from '../src/types/index.js';

const fs = await import('fs');
const path = await import('path');

const DB_DIR = path.join(process.cwd(), 'server', 'db');
const PROMPTS_PATH = path.join(DB_DIR, 'prompts.json');
const CHATS_PATH = path.join(DB_DIR, 'chats.json');
const MESSAGES_PATH = path.join(DB_DIR, 'messages.json');

const PROMPT_VERSIONS_PATH = path.join(DB_DIR, 'promptVersions.json');

function ensureDbExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  for (const filePath of [PROMPTS_PATH, CHATS_PATH, MESSAGES_PATH, PROMPT_VERSIONS_PATH]) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '[]', 'utf-8');
    }
  }
}

function readJson<T>(filePath: string): T[] {
  ensureDbExists();
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

function writeJson<T>(filePath: string, data: T[]) {
  ensureDbExists();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Prompts ───────────────────────────────────────────────

export function savePrompt(title: string, summary: string, masterPrompt: string, chatId?: string): SavedPrompt {
  const prompts = readPrompts();
  const newPrompt: SavedPrompt = {
    id: uuidv4(),
    title,
    summary,
    masterPrompt,
    timestamp: Date.now(),
    chatId,
  };
  prompts.unshift(newPrompt);
  writeJson(PROMPTS_PATH, prompts);
  return newPrompt;
}

export function getAllPrompts(): SavedPrompt[] {
  return readPrompts();
}

export function getPromptById(id: string): SavedPrompt | undefined {
  const prompts = readPrompts();
  return prompts.find((p) => p.id === id);
}

export function deletePrompt(id: string): boolean {
  const prompts = readPrompts();
  const filtered = prompts.filter((p) => p.id !== id);
  if (filtered.length === prompts.length) return false;
  writeJson(PROMPTS_PATH, filtered);
  return true;
}

function readPrompts(): SavedPrompt[] {
  return readJson<SavedPrompt>(PROMPTS_PATH);
}

// ─── Prompt Versions (MasterPromptRecord) ──────────────────

export interface MasterPromptRecord {
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

function readPromptVersions(): MasterPromptRecord[] {
  return readJson<MasterPromptRecord>(PROMPT_VERSIONS_PATH);
}

function writePromptVersions(data: MasterPromptRecord[]) {
  writeJson(PROMPT_VERSIONS_PATH, data);
}

export function savePromptVersion(record: Omit<MasterPromptRecord, 'id' | 'version' | 'createdAt' | 'updatedAt'>): MasterPromptRecord {
  const versions = readPromptVersions();
  const existingForChat = versions.filter((v) => v.chatId === record.chatId);
  const nextVersion = existingForChat.length + 1;
  const now = Date.now();
  const newRecord: MasterPromptRecord = {
    ...record,
    id: uuidv4(),
    version: nextVersion,
    createdAt: now,
    updatedAt: now,
  };
  versions.unshift(newRecord);
  writePromptVersions(versions);
  return newRecord;
}

export function getPromptVersionsByChatId(chatId: string): MasterPromptRecord[] {
  const versions = readPromptVersions();
  return versions
    .filter((v) => v.chatId === chatId)
    .sort((a, b) => b.version - a.version);
}

export function getPromptVersionById(id: string): MasterPromptRecord | undefined {
  const versions = readPromptVersions();
  return versions.find((v) => v.id === id);
}

export function getLatestPromptVersion(chatId: string): MasterPromptRecord | undefined {
  const versions = getPromptVersionsByChatId(chatId);
  return versions[0] || undefined;
}

export function getPinnedPromptVersion(chatId: string): MasterPromptRecord | undefined {
  const versions = readPromptVersions();
  const pinned = versions.find((v) => v.chatId === chatId && v.isPinned);
  return pinned || getLatestPromptVersion(chatId);
}

export function pinPromptVersion(chatId: string, promptId: string): boolean {
  const versions = readPromptVersions();
  let found = false;
  for (const v of versions) {
    if (v.chatId === chatId) {
      if (v.id === promptId) {
        v.isPinned = true;
        found = true;
      } else {
        v.isPinned = false;
      }
    }
  }
  if (found) writePromptVersions(versions);
  return found;
}

export function deletePromptVersion(id: string): boolean {
  const versions = readPromptVersions();
  const filtered = versions.filter((v) => v.id !== id);
  if (filtered.length === versions.length) return false;
  writePromptVersions(filtered);
  return true;
}

// ─── Chat Sessions ─────────────────────────────────────────

export interface ChatSession {
  id: string;
  title: string;
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

export function saveChatSession(data: {
  title: string;
  presetKey?: string;
  metadata?: ChatSession['metadata'];
}): ChatSession {
  const chats = readJson<ChatSession>(CHATS_PATH);
  const now = Date.now();
  const newChat: ChatSession = {
    id: uuidv4(),
    title: data.title,
    presetKey: data.presetKey,
    metadata: data.metadata,
    createdAt: now,
    updatedAt: now,
  };
  chats.unshift(newChat);
  writeJson(CHATS_PATH, chats);
  return newChat;
}

export function getAllChatSessions(): ChatSession[] {
  return readJson<ChatSession>(CHATS_PATH);
}

export function getChatSessionById(id: string): ChatSession | undefined {
  const chats = readJson<ChatSession>(CHATS_PATH);
  return chats.find((c) => c.id === id);
}

export function updateChatSession(id: string, updates: Partial<Pick<ChatSession, 'title' | 'updatedAt'>>): ChatSession | undefined {
  const chats = readJson<ChatSession>(CHATS_PATH);
  const idx = chats.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  chats[idx] = { ...chats[idx], ...updates, updatedAt: Date.now() };
  writeJson(CHATS_PATH, chats);
  return chats[idx];
}

export function deleteChatSession(id: string): boolean {
  const chats = readJson<ChatSession>(CHATS_PATH);
  const filtered = chats.filter((c) => c.id !== id);
  if (filtered.length === chats.length) return false;
  writeJson(CHATS_PATH, filtered);
  // Also delete associated messages
  const messages = readJson<ChatMessage>(MESSAGES_PATH);
  const filteredMsgs = messages.filter((m) => m.chatId !== id);
  writeJson(MESSAGES_PATH, filteredMsgs);
  return true;
}

// ─── Messages ──────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function saveMessage(data: {
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
}): ChatMessage {
  const messages = readJson<ChatMessage>(MESSAGES_PATH);
  const newMsg: ChatMessage = {
    id: uuidv4(),
    chatId: data.chatId,
    role: data.role,
    content: data.content,
    timestamp: Date.now(),
  };
  messages.push(newMsg);
  writeJson(MESSAGES_PATH, messages);
  return newMsg;
}

export function getMessagesByChatId(chatId: string): ChatMessage[] {
  const messages = readJson<ChatMessage>(MESSAGES_PATH);
  return messages
    .filter((m) => m.chatId === chatId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function getMasterPromptByChatId(chatId: string): SavedPrompt | undefined {
  const prompts = readPrompts();
  return prompts.find((p) => p.chatId === chatId);
}
