import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ChatSession, Message, MasterPromptResponse, NewChatFormValues, PromptVersion } from '../types';
import * as api from '../lib/apiClient';
import type { SectionMessage } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';

const STORAGE_KEY = 'prompt-workspace-chats-v2';
const STORAGE_VERSION = 2;

interface PersistedState {
  version: number;
  chats: ChatSession[];
  activeChatId: string | null;
  messagesByChatId: Record<string, Message[]>;
  promptsByChatId: Record<string, MasterPromptResponse | null>;
  promptVersionsByChatId: Record<string, PromptVersion[]>;
  sectionMessagesByChatId: Record<string, SectionMessage[]>;
  timestamp: number;
}

type ChatState = {
  chats: ChatSession[];
  activeChatId: string | null;
  messagesByChatId: Record<string, Message[]>;
  promptsByChatId: Record<string, MasterPromptResponse | null>;
  promptVersionsByChatId: Record<string, PromptVersion[]>;
  sectionMessagesByChatId: Record<string, SectionMessage[]>;
  loading: boolean;
  hydrated: boolean;
};

type ChatAction =
  | { type: 'HYDRATE'; payload: PersistedState }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CHATS'; payload: ChatSession[] }
  | { type: 'SET_ACTIVE_CHAT'; payload: string | null }
  | { type: 'ADD_CHAT'; payload: ChatSession }
  | { type: 'UPDATE_CHAT'; payload: { id: string; updates: Partial<ChatSession> } }
  | { type: 'DELETE_CHAT'; payload: string }
  | { type: 'SET_MESSAGES'; payload: { chatId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: Message } }
  | { type: 'SET_PROMPT'; payload: { chatId: string; prompt: MasterPromptResponse | null } }
  | { type: 'ADD_PROMPT_VERSION'; payload: { chatId: string; version: PromptVersion } }
  | { type: 'PIN_VERSION'; payload: { chatId: string; promptId: string } }
  | { type: 'ADD_SECTION_MESSAGE'; payload: { chatId: string; message: SectionMessage } }
  | { type: 'SET_SECTION_MESSAGES'; payload: { chatId: string; messages: SectionMessage[] } }
  | { type: 'DELETE_PROMPT_VERSION'; payload: { chatId: string; promptId: string } }
  | { type: 'RESET_ALL' };

const initialState: ChatState = {
  chats: [],
  activeChatId: null,
  messagesByChatId: {},
  promptsByChatId: {},
  promptVersionsByChatId: {},
  sectionMessagesByChatId: {},
  loading: true,
  hydrated: false,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'HYDRATE': {
      const { chats, activeChatId, messagesByChatId, promptsByChatId, promptVersionsByChatId, sectionMessagesByChatId } = action.payload;
      return {
        ...state,
        chats,
        activeChatId,
        messagesByChatId,
        promptsByChatId,
        promptVersionsByChatId: promptVersionsByChatId || {},
        sectionMessagesByChatId: sectionMessagesByChatId || {},
        loading: false,
        hydrated: true,
      };
    }
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_CHATS':
      return { ...state, chats: action.payload, loading: false };
    case 'SET_ACTIVE_CHAT':
      return { ...state, activeChatId: action.payload };
    case 'ADD_CHAT':
      return {
        ...state,
        chats: [action.payload, ...state.chats],
        activeChatId: action.payload.id,
        messagesByChatId: { ...state.messagesByChatId, [action.payload.id]: [] },
        promptsByChatId: { ...state.promptsByChatId, [action.payload.id]: null },
        promptVersionsByChatId: { ...state.promptVersionsByChatId, [action.payload.id]: [] },
        sectionMessagesByChatId: { ...state.sectionMessagesByChatId, [action.payload.id]: [] },
      };
    case 'UPDATE_CHAT':
      return {
        ...state,
        chats: state.chats.map((c) => (c.id === action.payload.id ? { ...c, ...action.payload.updates } : c)),
      };
    case 'DELETE_CHAT': {
      const newChats = state.chats.filter((c) => c.id !== action.payload);
      const newMessages = { ...state.messagesByChatId };
      const newPrompts = { ...state.promptsByChatId };
      const newVersions = { ...state.promptVersionsByChatId };
      const newSectionMessages = { ...state.sectionMessagesByChatId };
      delete newMessages[action.payload];
      delete newPrompts[action.payload];
      delete newVersions[action.payload];
      delete newSectionMessages[action.payload];
      let newActiveId = state.activeChatId;
      if (state.activeChatId === action.payload) {
        newActiveId = newChats.length > 0 ? newChats[0].id : null;
      }
      return {
        ...state,
        chats: newChats,
        messagesByChatId: newMessages,
        promptsByChatId: newPrompts,
        promptVersionsByChatId: newVersions,
        sectionMessagesByChatId: newSectionMessages,
        activeChatId: newActiveId,
      };
    }
    case 'SET_MESSAGES':
      return {
        ...state,
        messagesByChatId: { ...state.messagesByChatId, [action.payload.chatId]: action.payload.messages },
      };
    case 'ADD_MESSAGE':
      return {
        ...state,
        messagesByChatId: {
          ...state.messagesByChatId,
          [action.payload.chatId]: [...(state.messagesByChatId[action.payload.chatId] || []), action.payload.message],
        },
      };
    case 'SET_PROMPT':
      return {
        ...state,
        promptsByChatId: { ...state.promptsByChatId, [action.payload.chatId]: action.payload.prompt },
      };
    case 'ADD_PROMPT_VERSION':
      return {
        ...state,
        promptVersionsByChatId: {
          ...state.promptVersionsByChatId,
          [action.payload.chatId]: [
            action.payload.version,
            ...(state.promptVersionsByChatId[action.payload.chatId] || []),
          ],
        },
      };
    case 'PIN_VERSION':
      return {
        ...state,
        promptVersionsByChatId: {
          ...state.promptVersionsByChatId,
          [action.payload.chatId]: (state.promptVersionsByChatId[action.payload.chatId] || []).map((v) =>
            v.id === action.payload.promptId
              ? { ...v, isPinned: true }
              : { ...v, isPinned: false }
          ),
        },
      };
    case 'ADD_SECTION_MESSAGE':
      return {
        ...state,
        sectionMessagesByChatId: {
          ...state.sectionMessagesByChatId,
          [action.payload.chatId]: [
            ...(state.sectionMessagesByChatId[action.payload.chatId] || []),
            action.payload.message,
          ],
        },
      };
    case 'SET_SECTION_MESSAGES':
      return {
        ...state,
        sectionMessagesByChatId: {
          ...state.sectionMessagesByChatId,
          [action.payload.chatId]: action.payload.messages,
        },
      };
    case 'DELETE_PROMPT_VERSION':
      return {
        ...state,
        promptVersionsByChatId: {
          ...state.promptVersionsByChatId,
          [action.payload.chatId]: (state.promptVersionsByChatId[action.payload.chatId] || []).filter(
            (v) => v.id !== action.payload.promptId
          ),
        },
      };
    case 'RESET_ALL':
      return initialState;
    default:
      return state;
  }
}

function sanitizeTitle(text: string): string {
  return text
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[^\w\s\-.,!?&'()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);
}

function generateSmartTitle(form: NewChatFormValues): string {
  const parts: string[] = [];
  if (form.audience) parts.push(form.audience);
  if (form.goal) parts.push(form.goal);
  if (parts.length > 0) {
    return sanitizeTitle(parts.join(' \u2014 '));
  }
  if (form.websiteType) {
    return sanitizeTitle(form.websiteType);
  }
  return 'New Chat';
}

function emptyPersisted(): PersistedState {
  return {
    version: STORAGE_VERSION,
    chats: [],
    activeChatId: null,
    messagesByChatId: {},
    promptsByChatId: {},
    promptVersionsByChatId: {},
    sectionMessagesByChatId: {},
    timestamp: Date.now(),
  };
}

function loadPersistedState(key: string): PersistedState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed.version !== STORAGE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePersistedState(state: ChatState, key: string): void {
  try {
    const toPersist: PersistedState = {
      version: STORAGE_VERSION,
      chats: state.chats,
      activeChatId: state.activeChatId,
      messagesByChatId: state.messagesByChatId,
      promptsByChatId: state.promptsByChatId,
      promptVersionsByChatId: state.promptVersionsByChatId,
      sectionMessagesByChatId: state.sectionMessagesByChatId,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(toPersist));
  } catch {
    // ignore storage errors (quota, private mode, etc.)
  }
}

interface ChatContextValue extends ChatState {
  setActiveChat: (chatId: string) => void;
  createNewChat: (form: NewChatFormValues) => Promise<ChatSession>;
  renameChat: (chatId: string, title: string) => Promise<void>;
  addMessage: (chatId: string, message: Message) => void;
  setPrompt: (chatId: string, prompt: MasterPromptResponse | null) => void;
  addPromptVersion: (chatId: string, response: MasterPromptResponse) => void;
  pinPrompt: (chatId: string, promptId: string) => void;
  clonePrompt: (sourcePromptId: string, newChatTitle?: string) => string | null;
  addSectionMessage: (chatId: string, type: SectionMessage['sectionType'], role: 'user' | 'assistant', content: string) => void;
  setSectionMessages: (chatId: string, messages: SectionMessage[]) => void;
  deletePromptVersion: (chatId: string, promptId: string) => void;
  deleteChat: (chatId: string) => Promise<void>;
  loadChatData: (chatId: string) => Promise<void>;
  loadChats: () => Promise<void>;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { currentUser, authReady } = useAuth();

  // Memory is namespaced per logged-in user. Anonymous sessions have no key,
  // so their state is kept in memory only and is never persisted.
  const storageKey = currentUser ? `${STORAGE_KEY}:${currentUser.uid}` : null;

  useEffect(() => {
    if (!authReady) return;
    const persisted = storageKey ? loadPersistedState(storageKey) : null;
    dispatch({ type: 'HYDRATE', payload: persisted ?? emptyPersisted() });
  }, [authReady, storageKey]);

  useEffect(() => {
    if (state.hydrated && !state.loading && currentUser && storageKey) {
      savePersistedState(state, storageKey);
    }
  }, [state, currentUser, storageKey]);

  // Chats/messages/prompt versions are the client's source of truth and are
  // persisted to localStorage. The backend is only used for AI generation, so
  // these loaders are intentionally no-ops to avoid overwriting local data
  // with the ephemeral (redeploy-reset) backend database.
  const loadChats = useCallback(async () => {
    // No-op: chat list is restored from localStorage during hydration.
  }, []);

  const setActiveChat = useCallback((chatId: string) => {
    dispatch({ type: 'SET_ACTIVE_CHAT', payload: chatId });
  }, []);

  const createNewChat = useCallback(async (form: NewChatFormValues) => {
    const presetKeyMap: Record<string, string> = {
      SaaS: 'saas',
      Portfolio: 'portfolio',
      Agency: 'agency',
      'Landing Page': 'landing',
      'E-commerce': 'ecommerce',
      Custom: 'custom',
    };

    const title = form.title || generateSmartTitle(form);
    const isDefaultTitle = !form.title;
    const now = Date.now();

    const chat: ChatSession = {
      id: uuidv4(),
      title,
      isDefaultTitle,
      presetKey: presetKeyMap[form.websiteType] || 'custom',
      metadata: {
        websiteType: form.websiteType,
        audience: form.audience,
        goal: form.goal,
        preferredStack: form.preferredStack,
        style: form.style,
      },
      createdAt: now,
      updatedAt: now,
    };

    dispatch({ type: 'ADD_CHAT', payload: chat });
    return chat;
  }, []);

  const renameChat = useCallback(async (chatId: string, title: string) => {
    const now = Date.now();
    dispatch({ type: 'UPDATE_CHAT', payload: { id: chatId, updates: { title, updatedAt: now } } });
    try {
      await api.renameChat(chatId, title);
    } catch (err) {
      console.error('Failed to rename chat on server:', err);
    }
  }, []);

  const addMessage = useCallback((chatId: string, message: Message) => {
    dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message } });
  }, []);

  const addSectionMessage = useCallback(
    (chatId: string, type: SectionMessage['sectionType'], role: 'user' | 'assistant', content: string) => {
      const msg: SectionMessage = {
        id: uuidv4(),
        chatId,
        sectionType: type,
        role,
        content,
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_SECTION_MESSAGE', payload: { chatId, message: msg } });
    },
    []
  );

  const setSectionMessages = useCallback((chatId: string, messages: SectionMessage[]) => {
    dispatch({ type: 'SET_SECTION_MESSAGES', payload: { chatId, messages } });
  }, []);

  const deletePromptVersion = useCallback((chatId: string, promptId: string) => {
    dispatch({ type: 'DELETE_PROMPT_VERSION', payload: { chatId, promptId } });
  }, []);

  const setPrompt = useCallback((chatId: string, prompt: MasterPromptResponse | null) => {
    dispatch({ type: 'SET_PROMPT', payload: { chatId, prompt } });
  }, []);

  const addPromptVersion = useCallback(
    (chatId: string, response: MasterPromptResponse) => {
      const existing = state.promptVersionsByChatId[chatId] || [];
      const version: PromptVersion = {
        id: response.id || response.promptId || uuidv4(),
        chatId,
        version: existing.length + 1,
        title: (response.summary && response.summary.trim()) || `Master Prompt v${existing.length + 1}`,
        summary: response.summary ?? '',
        analysis: response.analysis ?? '',
        masterPrompt: response.prompt ?? '',
        isPinned: existing.length === 0,
        createdAt: response.timestamp ?? Date.now(),
        updatedAt: Date.now(),
      };
      dispatch({ type: 'ADD_PROMPT_VERSION', payload: { chatId, version } });
    },
    [state.promptVersionsByChatId]
  );

  const pinPrompt = useCallback((chatId: string, promptId: string) => {
    dispatch({ type: 'PIN_VERSION', payload: { chatId, promptId } });
    api.pinPromptVersion(chatId, promptId).catch((err) => {
      console.error('Failed to pin prompt on server:', err);
    });
  }, []);

  const clonePrompt = useCallback(
    (sourcePromptId: string, newChatTitle?: string): string | null => {
      let newChatId: string | null = null;
      const allVersions = state.promptVersionsByChatId;
      for (const chatId of Object.keys(allVersions)) {
        const found = allVersions[chatId].find((v) => v.id === sourcePromptId);
        if (found) {
          const now = Date.now();
          const newChat: ChatSession = {
            id: uuidv4(),
            title: newChatTitle || `${found.title} (Clone)`,
            isDefaultTitle: false,
            createdAt: now,
            updatedAt: now,
          };
          const clonedVersion: PromptVersion = {
            ...found,
            id: uuidv4(),
            chatId: newChat.id,
            version: 1,
            isPinned: true,
            createdAt: now,
            updatedAt: now,
          };
          dispatch({ type: 'ADD_CHAT', payload: newChat });
          dispatch({
            type: 'ADD_PROMPT_VERSION',
            payload: { chatId: newChat.id, version: clonedVersion },
          });
          dispatch({ type: 'SET_PROMPT', payload: { chatId: newChat.id, prompt: {
            id: clonedVersion.id,
            chatId: newChat.id,
            summary: clonedVersion.summary,
            analysis: clonedVersion.analysis,
            prompt: clonedVersion.masterPrompt,
            sections: [],
            createdAt: new Date(clonedVersion.createdAt).toISOString(),
            timestamp: clonedVersion.createdAt,
          } } });
          newChatId = newChat.id;
          break;
        }
      }
      return newChatId;
    },
    [state.promptVersionsByChatId]
  );

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await api.deleteChat(chatId);
    } catch (err) {
      console.error('Failed to delete chat on server:', err);
    }
    dispatch({ type: 'DELETE_CHAT', payload: chatId });
  }, []);

  const loadChatData = useCallback(async (_chatId: string) => {
    // No-op: messages/prompt are restored from localStorage during hydration.
  }, []);

  const clearError = useCallback(() => {
    // No global error state in reducer; kept for API compatibility
  }, []);

  const value: ChatContextValue = {
    ...state,
    setActiveChat,
    createNewChat,
    renameChat,
    addMessage,
    setPrompt,
    addPromptVersion,
    pinPrompt,
    clonePrompt,
    addSectionMessage,
    setSectionMessages,
    deletePromptVersion,
    deleteChat,
    loadChatData,
    loadChats,
    clearError,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return ctx;
}