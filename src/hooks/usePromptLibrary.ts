import { useState, useCallback } from 'react';
import type { PromptVersion } from '../types';
import { useChatContext } from '../context/ChatContext';

export function usePromptLibrary() {
  const { activeChatId, promptVersionsByChatId, pinPrompt, clonePrompt } = useChatContext();

  const [viewingPrompt, setViewingPrompt] = useState<PromptVersion | null>(null);

  const promptVersions: PromptVersion[] = activeChatId
    ? promptVersionsByChatId[activeChatId] || []
    : [];

  const loadPromptVersions = useCallback((_chatId?: string) => {
    // Versions are stored locally in ChatContext and persisted to
    // localStorage, so there is nothing to fetch from the server.
  }, []);

  const clearError = useCallback(() => {
    // Local-only; no error state to clear.
  }, []);

  return {
    promptVersions,
    isLoading: false,
    error: null,
    viewingPrompt,
    setViewingPrompt,
    loadPromptVersions,
    pinPrompt,
    clonePrompt,
    clearError,
  };
}
