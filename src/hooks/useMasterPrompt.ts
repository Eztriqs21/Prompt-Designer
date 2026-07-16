import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message, MasterPromptResponse, MasterPromptRequest } from '../types';
import * as api from '../lib/apiClient';
import { useChatContext } from '../context/ChatContext';

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
  generatedBy: string | null;
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
  const { activeChatId, messagesByChatId, promptsByChatId, addMessage, setPrompt } = useChatContext();

  const [state, setState] = useState<MasterPromptState>({
    messages: [WELCOME_MESSAGE],
    isGenerating: false,
    generatedPrompt: null,
    generatedSummary: null,
    generatedAnalysis: null,
    generatedBy: null,
    error: null,
    remaining: 5,
  });

  const configRef = useRef(config);
  configRef.current = config;

  const generatingRef = useRef(false);
  const prevChatIdRef = useRef<string | null>(null);

  // Sync messages from chat context when active chat changes
  useEffect(() => {
    const chatId = configRef.current.chatId ?? activeChatId;
    if (chatId !== prevChatIdRef.current) {
      prevChatIdRef.current = chatId;
      if (!chatId) {
        setState((prev) => ({
          ...prev,
          messages: [WELCOME_MESSAGE],
          generatedPrompt: null,
          generatedSummary: null,
          generatedAnalysis: null,
          generatedBy: null,
          isGenerating: false,
          error: null,
        }));
        return;
      }
      const chatMessages = messagesByChatId[chatId] || [];
      const chatPrompt = promptsByChatId[chatId] || null;

      if (chatMessages.length > 0) {
        setState((prev) => ({
          ...prev,
          messages: chatMessages,
          generatedPrompt: chatPrompt?.masterPrompt ?? null,
          generatedSummary: chatPrompt?.summary ?? null,
          generatedAnalysis: chatPrompt?.analysis ?? null,
          generatedBy: null,
          isGenerating: false,
          error: null,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          messages: [WELCOME_MESSAGE],
          generatedPrompt: null,
          generatedSummary: null,
          generatedAnalysis: null,
          generatedBy: null,
          isGenerating: false,
          error: null,
        }));
      }
    }
  }, [activeChatId, messagesByChatId, promptsByChatId]);

  // When config.chatId changes (e.g., from URL param), sync with context
  useEffect(() => {
    if (config.chatId && config.chatId !== activeChatId) {
      // This handles the case where URL has a chatId but context doesn't
      // The context's setActiveChat should be called by parent
    }
  }, [config.chatId, activeChatId]);

  const addUserMessage = useCallback(
    (content: string) => {
      const chatId = configRef.current.chatId ?? activeChatId;
      if (!chatId) return;

      const msg: Message = {
        id: uuidv4(),
        chatId,
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      addMessage(chatId, msg);
      setState((prev) => ({ ...prev, messages: [...prev.messages, msg] }));
      return msg;
    },
    [activeChatId, addMessage]
  );

  const generate = useCallback(
    async (idea: string) => {
      const chatId = configRef.current.chatId ?? activeChatId;
      if (!chatId) return;
      if (generatingRef.current) return;

      generatingRef.current = true;
      setState((prev) => ({ ...prev, isGenerating: true, error: null }));

      // Real abort controller so the in-flight fetch is actually cancelled on
      // a client timeout / unmount. The server keeps running in the
      // background and persists the result, which we recover below.
      const controller = new AbortController();
      // Safety net only: the backend normally answers within ~one model's
      // latency (parallel first-success), so this rarely fires.
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      const applyResult = (response: MasterPromptResponse) => {
        const assistantMsg: Message = {
          id: uuidv4(),
          chatId,
          role: 'assistant',
          content: `Here's your master prompt:\n\n${response.masterPrompt.slice(0, 500)}${response.masterPrompt.length > 500 ? '...' : ''}`,
          timestamp: Date.now(),
        };
        addMessage(chatId, assistantMsg);
        setPrompt(chatId, response);
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMsg],
          generatedPrompt: response.masterPrompt,
          generatedSummary: response.summary,
          generatedAnalysis: response.analysis,
          generatedBy: response.meta?.model ?? null,
          isGenerating: false,
          error: null,
          remaining: Math.max(0, response.remaining ?? prev.remaining - 1),
        }));
      };

      // Poll the server for a late save after a client abort/timeout.
      const recoverLatest = async (): Promise<boolean> => {
        for (let attempt = 0; attempt < 4; attempt++) {
          await new Promise((r) => setTimeout(r, 3000));
          try {
            const versions = await api.getPromptVersions(chatId);
            const latest = versions && versions[0];
            const recentMs = 10 * 60 * 1000;
            if (latest && Date.now() - (latest.createdAt || latest.updatedAt || 0) < recentMs) {
              const recovered: MasterPromptResponse = {
                id: latest.id,
                chatId,
                summary: latest.summary,
                analysis: latest.analysis,
                masterPrompt: latest.masterPrompt,
                timestamp: latest.createdAt,
              };
              applyResult(recovered);
              return true;
            }
          } catch {
            // keep polling
          }
        }
        return false;
      };

      try {
        const conversationHistory: Message[] = state.messages.map((m) => ({
          ...m,
          chatId,
        }));

        const response: MasterPromptResponse = await api.generateMasterPrompt(
          {
            chatId,
            presetKey: configRef.current.presetKey,
            metadata: configRef.current.metadata,
            idea,
            conversationHistory,
          },
          controller.signal,
        );
        clearTimeout(timeoutId);

        applyResult(response);
        return response;
      } catch (err: any) {
        clearTimeout(timeoutId);
        const isAbort = err?.name === 'AbortError' || controller.signal.aborted;

        // Client aborted (timeout or unmount). The server often keeps
        // running and saves the result — poll for it so a valid reply is
        // never lost to a premature check.
        if (isAbort) {
          const recovered = await recoverLatest();
          if (recovered) return null;
          setState((prev) => ({
            ...prev,
            isGenerating: false,
            error:
              'Generation timed out. The server may still be working — your prompt may appear shortly or after refreshing.',
          }));
          return null;
        }

        // Genuine upstream/HTTP error: show it, but keep any previously
        // generated prompt visible (errors must be additive, not destructive).
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: err?.message || 'Failed to generate master prompt',
        }));
        return null;
      } finally {
        generatingRef.current = false;
      }
    },
    [activeChatId, state.messages, addMessage, setPrompt]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Expose a reset function that only clears ephemeral generation state
  const resetForChat = useCallback((_messages: Message[] = [], _prompt: MasterPromptResponse | null = null) => {
    // This is now a no-op for persisted data.
    // Local ephemeral state (isGenerating, error) can be cleared if needed.
    setState((prev) => ({
      ...prev,
      isGenerating: false,
      error: null,
    }));
  }, []);

  return {
    ...state,
    addUserMessage,
    generate,
    clearError,
    resetForChat,
  };
}