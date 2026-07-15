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

export function useChats() {
  const [state, setState] = useState<ChatsState>({
    activeChatId: null,
    chats: [],
    messagesByChatId: {},
    promptsByChatId: {},
    loading: true,
  });

  // Use refs to avoid stale closures in callbacks
  const messagesRef = useRef<Record<string, Message[]>>({});
  const promptsRef = useRef<Record<string, MasterPromptResponse | null>>({});

  // Keep refs in sync with state
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

      // Auto-select first chat if none selected
      if (chats.length > 0) {
        loadChatData(chats[0].id);
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [loadChatData]);

  // Load all chats on mount
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const setActiveChat = useCallback(
    (chatId: string) => {
      setState((prev) => ({ ...prev, activeChatId: chatId }));
      // Use ref to check if data is loaded (avoids stale closure)
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

        const chat = await api.createChat({
          title: form.title || `${form.websiteType} — ${new Date().toLocaleDateString()}`,
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
            ...prev.messagesByChatId,
            [chat.id]: [],
          },
          promptsByChatId: {
            ...prev.promptsByChatId,
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
        setState((prev) => {
          const newChats = prev.chats.filter((c) => c.id !== chatId);
          const newMsgs = { ...prev.messagesByChatId };
          const newPrompts = { ...prev.promptsByChatId };
          delete newMsgs[chatId];
          delete newPrompts[chatId];

          let newActiveId = prev.activeChatId;
          if (newActiveId === chatId) {
            newActiveId = newChats.length > 0 ? newChats[0].id : null;
            if (newActiveId && !newMsgs[newActiveId]) {
              loadChatData(newActiveId);
            }
          }

          return {
            ...prev,
            chats: newChats,
            messagesByChatId: newMsgs,
            promptsByChatId: newPrompts,
            activeChatId: newActiveId,
          };
        });
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
    addMessage,
    setPrompt,
    deleteChat,
    loadChatData,
  };
}
