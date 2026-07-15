import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatSession, Message, MasterPromptResponse } from '../types';
import * as api from '../lib/apiClient';

interface NewChatFormValues {
  title: string;
  websiteType: string;
  audience: string;
  goal: string;
  preferredStack: string;
  style: string;
}

interface ChatsState {
  activeChatId: string | null;
  chats: ChatSession[];
  messagesByChatId: Record<string, Message[]>;
  promptsByChatId: Record<string, MasterPromptResponse | null>;
  loading: boolean;
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
    return sanitizeTitle(parts.join(' — '));
  }
  if (form.websiteType) {
    return sanitizeTitle(form.websiteType);
  }
  return 'New Chat';
}

export function useChats(initialChatId: string | null = null) {
  const [state, setState] = useState<ChatsState>({
    activeChatId: initialChatId,
    chats: [],
    messagesByChatId: {},
    promptsByChatId: {},
    loading: true,
  });

  const messagesRef = useRef<Record<string, Message[]>>({});
  const promptsRef = useRef<Record<string, MasterPromptResponse | null>>({});

  messagesRef.current = state.messagesByChatId;
  promptsRef.current = state.promptsByChatId;

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

      setState((prev) => ({
        ...prev,
        messagesByChatId: {
          ...prev.messagesByChatId,
          [chatId]: msgs,
        },
        promptsByChatId: {
          ...prev.promptsByChatId,
          [chatId]: prompt,
        },
      }));
    } catch (err) {
      console.error('Failed to load chat data:', err);
    }
  }, []);

  const loadChats = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const chats = await api.getChats();
      setState((prev) => ({ ...prev, chats, loading: false }));

      // Auto-select first chat only if no initial chat was provided
      if (chats.length > 0 && !initialChatId) {
        loadChatData(chats[0].id);
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [loadChatData, initialChatId]);

  // Load all chats on mount
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Load initial chat data if provided
  useEffect(() => {
    if (initialChatId) {
      loadChatData(initialChatId);
    }
  }, [initialChatId, loadChatData]);

  const setActiveChat = useCallback(
    (chatId: string) => {
      setState((prev) => ({ ...prev, activeChatId: chatId }));
      if (!messagesRef.current[chatId]) {
        loadChatData(chatId);
      }
    },
    [loadChatData]
  );

  const createNewChat = useCallback(
    async (form: NewChatFormValues) => {
      try {
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

        setState((prev) => ({
          ...prev,
          chats: [chat, ...prev.chats],
          activeChatId: chat.id,
          messagesByChatId: {
            [chat.id]: [],
          },
          promptsByChatId: {
            [chat.id]: null,
          },
        }));

        return chat;
      } catch (err) {
        console.error('Failed to create chat:', err);
        throw err;
      }
    },
    []
  );

  const renameChat = useCallback(
    async (chatId: string, title: string) => {
      try {
        const updated = await api.renameChat(chatId, title);
        setState((prev) => ({
          ...prev,
          chats: prev.chats.map((c) => (c.id === chatId ? updated : c)),
        }));
      } catch (err) {
        console.error('Failed to rename chat:', err);
      }
    },
    []
  );

  const addMessage = useCallback((chatId: string, message: Message) => {
    setState((prev) => ({
      ...prev,
      messagesByChatId: {
        ...prev.messagesByChatId,
        [chatId]: [...(prev.messagesByChatId[chatId] || []), message],
      },
    }));
  }, []);

  const setPrompt = useCallback((chatId: string, response: MasterPromptResponse) => {
    setState((prev) => ({
      ...prev,
      promptsByChatId: {
        ...prev.promptsByChatId,
        [chatId]: response,
      },
    }));
  }, []);

  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        await api.deleteChat(chatId);
        let newActiveId: string | null = null;
        setState((prev) => {
          const newChats = prev.chats.filter((c) => c.id !== chatId);
          const newMsgs = { ...prev.messagesByChatId };
          const newPrompts = { ...prev.promptsByChatId };
          delete newMsgs[chatId];
          delete newPrompts[chatId];

          if (prev.activeChatId === chatId) {
            newActiveId = newChats.length > 0 ? newChats[0].id : null;
          } else {
            newActiveId = prev.activeChatId;
          }

          return {
            ...prev,
            chats: newChats,
            messagesByChatId: newMsgs,
            promptsByChatId: newPrompts,
            activeChatId: newActiveId,
          };
        });
        if (newActiveId) {
          loadChatData(newActiveId);
        }
      } catch (err) {
        console.error('Failed to delete chat:', err);
      }
    },
    [loadChatData]
  );

  return {
    ...state,
    loadChats,
    setActiveChat,
    createNewChat,
    renameChat,
    addMessage,
    setPrompt,
    deleteChat,
    loadChatData,
  };
}