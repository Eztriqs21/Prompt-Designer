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

  const messagesRef = useRef(state.messages);
  messagesRef.current = state.messages;

  const configRef = useRef(config);
  configRef.current = config;

  const generatingRef = useRef(false);

  const prevChatIdRef = useRef<string | null>(null);
  const loadedChatIdRef = useRef<string | null>(null);

  const resetForChat = useCallback((messages: Message[], prompt: MasterPromptResponse | null) => {
    const currentChatId = configRef.current.chatId;

    if (currentChatId !== prevChatIdRef.current) {
      prevChatIdRef.current = currentChatId;
      loadedChatIdRef.current = null;
    }

    if (messages.length > 0) {
      loadedChatIdRef.current = currentChatId;
    }

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
      if (generatingRef.current) return;

      generatingRef.current = true;
      setState((prev) => ({ ...prev, isGenerating: true, error: null }));

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('GENERATION_TIMEOUT')), 60000)
      );

      try {
        const conversationHistory: Message[] = messagesRef.current.map((m) => ({
          ...m,
          chatId,
        }));

        const response: MasterPromptResponse = await Promise.race([
          api.generateMasterPrompt({
            chatId,
            presetKey: configRef.current.presetKey,
            metadata: configRef.current.metadata,
            idea,
            conversationHistory,
          }),
          timeoutPromise,
        ]);

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
          error: null,
          remaining: Math.max(0, response.remaining ?? prev.remaining - 1),
        }));

        return response;
      } catch (err: any) {
        const isTimeout = err?.message === 'GENERATION_TIMEOUT';
        const message = isTimeout
          ? 'Generation timed out (60s). The server may be busy. Please try again.'
          : err?.message || 'Failed to generate master prompt';

        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: message,
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