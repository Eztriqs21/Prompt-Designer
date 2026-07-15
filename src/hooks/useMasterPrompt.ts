import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message, MasterPromptResponse, MasterPromptRequest } from '../types';
import * as api from '../lib/apiClient';

export interface MasterPromptConfig {
  chatId: string | null;
  presetKey?: string;
  metadata?: MasterPromptRequest['metadata'];
}

export interface MasterPromptState {
  messages: Message[];
  isGenerating: boolean;
  generatedPrompt: string | null;
  generatedSummary: string | null;
  generatedAnalysis: string | null;
  error: string | null;
  remaining: number;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  chatId: '',
  role: 'assistant',
  content:
    "I'm your Prompt Designer for website-building coding agents. Let's craft a master prompt for your site.\n\nStart by describing your website idea — what's it about, who's it for, and what should it do?",
  timestamp: Date.now() - 10000,
};

export function useMasterPrompt(config: MasterPromptConfig) {
  const [state, setState] = useState<MasterPromptState>({
    messages: [WELCOME_MESSAGE],
    isGenerating: false,
    generatedPrompt: null,
    generatedSummary: null,
    generatedAnalysis: null,
    error: null,
    remaining: 5,
  });

  // Use a ref for messages so generate() doesn't need state.messages in deps
  const messagesRef = useRef(state.messages);
  messagesRef.current = state.messages;

  // Use a ref for config so callbacks don't need config in deps
  const configRef = useRef(config);
  configRef.current = config;

  // Dedup guard: prevent concurrent generation requests
  const generatingRef = useRef(false);

  // Reset state when chat changes
  const prevChatIdRef = useRef<string | null>(null);
  const loadedChatIdRef = useRef<string | null>(null);

  const resetForChat = useCallback((messages: Message[], prompt: MasterPromptResponse | null) => {
    const currentChatId = configRef.current.chatId;

    // If the chat ID changed, always reset (this is a new chat switch)
    if (currentChatId !== prevChatIdRef.current) {
      prevChatIdRef.current = currentChatId;
      loadedChatIdRef.current = null; // Reset loaded state
    }

    // If we have non-empty messages, mark this chat as loaded
    if (messages.length > 0) {
      loadedChatIdRef.current = currentChatId;
    }

    // Skip if: same chat, already loaded, and incoming messages are empty
    // This prevents the premature empty reset from overwriting real data
    if (
      currentChatId === loadedChatIdRef.current &&
      messages.length === 0 &&
      !prompt
    ) {
      return;
    }

    setState({
      messages: messages.length > 0 ? messages : [WELCOME_MESSAGE],
      isGenerating: false,
      generatedPrompt: prompt?.masterPrompt ?? null,
      generatedSummary: prompt?.summary ?? null,
      generatedAnalysis: prompt?.analysis ?? null,
      error: null,
      remaining: 5,
    });
  }, []);

  const addUserMessage = useCallback(
    (content: string) => {
      const chatId = configRef.current.chatId;
      if (!chatId) return;
      const msg: Message = {
        id: uuidv4(),
        chatId,
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      setState((prev) => ({ ...prev, messages: [...prev.messages, msg] }));
      return msg;
    },
    []
  );

  const generate = useCallback(
    async (idea: string) => {
      const chatId = configRef.current.chatId;
      if (!chatId) return;
      if (generatingRef.current) return; // Dedup: skip if already generating

      generatingRef.current = true;
      setState((prev) => ({ ...prev, isGenerating: true, error: null }));

      try {
        // Use ref for messages to avoid stale closure
        const conversationHistory: Message[] = messagesRef.current.map((m) => ({
          ...m,
          chatId,
        }));

        const response: MasterPromptResponse = await api.generateMasterPrompt({
          chatId,
          presetKey: configRef.current.presetKey,
          metadata: configRef.current.metadata,
          idea,
          conversationHistory,
        });

        const assistantMsg: Message = {
          id: uuidv4(),
          chatId,
          role: 'assistant',
          content: `Here's your master prompt:\n\n${response.masterPrompt.slice(0, 500)}${response.masterPrompt.length > 500 ? '...' : ''}`,
          timestamp: Date.now(),
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMsg],
          generatedPrompt: response.masterPrompt,
          generatedSummary: response.summary,
          generatedAnalysis: response.analysis,
          isGenerating: false,
          remaining: Math.max(0, response.remaining ?? prev.remaining - 1),
        }));

        return response;
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: err.message || 'Failed to generate master prompt',
        }));
        return null;
      } finally {
        generatingRef.current = false;
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    addUserMessage,
    generate,
    clearError,
    resetForChat,
  };
}
