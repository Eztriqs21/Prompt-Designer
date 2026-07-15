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
}

export interface SectionPromptResponse {
  summary: string;
  analysis: string;
  masterPrompt: string;
}

export interface SectionState {
  isGenerating: boolean;
  data: SectionPromptResponse | null;
  error: string | null;
}
