import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { ChatSession, Message, MasterPromptResponse, NewChatFormValues } from '../types';
import * as api from '../lib/apiClient';

const STORAGE_KEY = 'prompt-workspace-chats-v2';
const STORAGE_VERSION = 2;

interface PersistedState {
  version: number;
  chats: ChatSession[];
  activeChatId: string | null;
  messagesByChatId: Record<string, Message[]>;
  promptsByChatId: Record<string, MasterPromptResponse | null>;
  timestamp: number;
}

type ChatState = {
  chats: ChatSession[];
  activeChatId: string | null;
  messagesByChatId: Record<string, Message[]>;
  promptsByChatId: Record<string, MasterPromptResponse | null>;
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
  | { type: 'RESET_ALL' };

const initialState: ChatState = {
  chats: [],
  activeChatId: null,
  messagesByChatId: {},
  promptsByChatId: {},
  loading: true,
  hydrated: false,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'HYDRATE': {
      const { chats, activeChatId, messagesByChatId, promptsByChatId } = action.payload;
      return {
        ...state,
        chats,
        activeChatId,
        messagesByChatId,
        promptsByChatId,
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
      delete newMessages[action.payload];
      delete newPrompts[action.payload];
      let newActiveId = state.activeChatId;
      if (state.activeChatId === action.payload) {
        newActiveId = newChats.length > 0 ? newChats[0].id : null;
      }
      return {
        ...state,
        chats: newChats,
        messagesByChatId: newMessages,
        promptsByChatId: newPrompts,
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

function loadPersistedState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed.version !== STORAGE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePersistedState(state: ChatState): void {
  try {
    const toPersist: PersistedState = {
      version: STORAGE_VERSION,
      chats: state.chats,
      activeChatId: state.activeChatId,
      messagesByChatId: state.messagesByChatId,
      promptsByChatId: state.promptsByChatId,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
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
  deleteChat: (chatId: string) => Promise<void>;
  loadChatData: (chatId: string) => Promise<void>;
  loadChats: () => Promise<void>;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const hydrate = useCallback(() => {
    const persisted = loadPersistedState();
    if (persisted) {
      dispatch({ type: 'HYDRATE', payload: persisted });
    } else {
      // Mark hydration complete even when storage is empty so the
      // persistence effect below can start writing to localStorage.
      dispatch({
        type: 'HYDRATE',
        payload: {
          version: STORAGE_VERSION,
          chats: [],
          activeChatId: null,
          messagesByChatId: {},
          promptsByChatId: {},
          timestamp: Date.now(),
        },
      });
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (state.hydrated && !state.loading) {
      savePersistedState(state);
    }
  }, [state.chats, state.activeChatId, state.messagesByChatId, state.promptsByChatId, state.hydrated, state.loading]);

  const loadChats = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const chats = await api.getChats();
      dispatch({ type: 'SET_CHATS', payload: chats });
      if (chats.length > 0 && !state.activeChatId) {
        dispatch({ type: 'SET_ACTIVE_CHAT', payload: chats[0].id });
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.activeChatId]);

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

    const chat = await api.createChat({
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
    });

    dispatch({
      type: 'ADD_CHAT',
      payload: chat,
    });

    return chat;
  }, []);

  const renameChat = useCallback(async (chatId: string, title: string) => {
    try {
      const updated = await api.renameChat(chatId, title);
      dispatch({ type: 'UPDATE_CHAT', payload: { id: chatId, updates: updated } });
    } catch (err) {
      console.error('Failed to rename chat:', err);
      throw err;
    }
  }, []);

  const addMessage = useCallback((chatId: string, message: Message) => {
    dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message } });
  }, []);

  const setPrompt = useCallback((chatId: string, prompt: MasterPromptResponse | null) => {
    dispatch({ type: 'SET_PROMPT', payload: { chatId, prompt } });
  }, []);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await api.deleteChat(chatId);
      dispatch({ type: 'DELETE_CHAT', payload: chatId });
    } catch (err) {
      console.error('Failed to delete chat:', err);
      throw err;
    }
  }, []);

  const loadChatData = useCallback(async (chatId: string) => {
    try {
      const chatData = await api.getChat(chatId);
      const msgs = chatData.messages || [];
      const prompt = chatData.lastPrompt
        ? {
            id: chatData.lastPrompt.id,
            chatId: chatData.lastPrompt.chatId,
            summary: chatData.lastPrompt.summary,
            analysis: '',
            masterPrompt: chatData.lastPrompt.masterPrompt,
            timestamp: chatData.lastPrompt.timestamp,
          }
        : null;

      dispatch({ type: 'SET_MESSAGES', payload: { chatId, messages: msgs } });
      dispatch({ type: 'SET_PROMPT', payload: { chatId, prompt } });
    } catch (err) {
      console.error('Failed to load chat data:', err);
    }
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