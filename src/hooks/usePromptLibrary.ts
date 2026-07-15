import { useState, useCallback, useRef } from 'react';
import type { PromptVersion } from '../types';
import * as api from '../lib/apiClient';

interface PromptLibraryState {
  promptVersions: PromptVersion[];
  isLoading: boolean;
  error: string | null;
}

export function usePromptLibrary() {
  const [state, setState] = useState<PromptLibraryState>({
    promptVersions: [],
    isLoading: false,
    error: null,
  });

  const chatIdRef = useRef<string | null>(null);

  const loadPromptVersions = useCallback(async (chatId: string) => {
    chatIdRef.current = chatId;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const versions = await api.getPromptVersions(chatId);
      // Only update if this is still the active chat
      if (chatIdRef.current === chatId) {
        setState({ promptVersions: versions, isLoading: false, error: null });
      }
    } catch (err: any) {
      if (chatIdRef.current === chatId) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err.message || 'Failed to load prompt versions',
        }));
      }
    }
  }, []);

  const pinPrompt = useCallback(async (chatId: string, promptId: string) => {
    try {
      await api.pinPromptVersion(chatId, promptId);
      setState((prev) => ({
        ...prev,
        promptVersions: prev.promptVersions.map((v) =>
          v.id === promptId ? { ...v, isPinned: true } : { ...v, isPinned: false }
        ),
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        error: err.message || 'Failed to pin prompt',
      }));
    }
  }, []);

  const clonePrompt = useCallback(async (sourcePromptId: string, newChatTitle?: string) => {
    try {
      const result = await api.clonePromptVersion(sourcePromptId, newChatTitle);
      return result.newChatId;
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        error: err.message || 'Failed to clone prompt',
      }));
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    loadPromptVersions,
    pinPrompt,
    clonePrompt,
    clearError,
  };
}
