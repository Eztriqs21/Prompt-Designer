import { useState, useCallback, useRef, useEffect } from 'react';
import type { SectionType, SectionState, Message } from '../types';
import * as api from '../lib/apiClient';
import type { SectionMessage } from '../lib/apiClient';
import { useChatContext } from '../context/ChatContext';

interface UseSectionPromptsConfig {
  chatId: string | null;
  masterPrompt: string | null;
  conversationHistory: Message[];
}

interface UseSectionPromptsReturn {
  sections: Record<SectionType, SectionState>;
  sectionMessages: Record<SectionType, SectionMessage[]>;
  activeSection: SectionType | null;
  setActiveSection: (type: SectionType | null) => void;
  generateSection: (type: SectionType, userRequest?: string) => Promise<void>;
  addSectionMessage: (type: SectionType, role: 'user' | 'assistant', content: string) => void;
  loadSectionMessages: (chatId: string, sectionType: SectionType) => Promise<void>;
}

function createEmptyState(): Record<SectionType, SectionState> {
  return {
    coding: { isGenerating: false, data: null, error: null },
    'ui-ux': { isGenerating: false, data: null, error: null },
    audit: { isGenerating: false, data: null, error: null },
  };
}

export function useSectionPrompts(config: UseSectionPromptsConfig): UseSectionPromptsReturn {
  const { sectionMessagesByChatId, addSectionMessage: ctxAddSectionMessage } = useChatContext();

  const [sections, setSections] = useState<Record<SectionType, SectionState>>(createEmptyState);
  const [activeSection, setActiveSection] = useState<SectionType | null>(null);

  const configRef = useRef(config);
  configRef.current = config;

  const chatIdRef = useRef<string | null>(null);

  // Reset generation results when the active chat changes. Section *messages*
  // are sourced from ChatContext (persisted locally), so they follow the chat
  // automatically.
  useEffect(() => {
    const chatId = config.chatId;
    if (!chatId) {
      setSections(createEmptyState());
      chatIdRef.current = null;
      return;
    }

    if (chatId === chatIdRef.current) return;
    chatIdRef.current = chatId;

    setSections(createEmptyState());
  }, [config.chatId]);

  const allSectionMessages = config.chatId ? sectionMessagesByChatId[config.chatId] || [] : [];
  const sectionMessages: Record<SectionType, SectionMessage[]> = {
    coding: allSectionMessages.filter((m) => m.sectionType === 'coding'),
    'ui-ux': allSectionMessages.filter((m) => m.sectionType === 'ui-ux'),
    audit: allSectionMessages.filter((m) => m.sectionType === 'audit'),
  };

  const loadSectionMessages = useCallback((_chatId: string, _sectionType: SectionType): Promise<void> => {
    // Section messages are persisted locally in ChatContext, so there is
    // nothing to fetch from the server.
    return Promise.resolve();
  }, []);

  const addSectionMessage = useCallback(
    (type: SectionType, role: 'user' | 'assistant', content: string) => {
      const chatId = configRef.current.chatId;
      if (!chatId) return;

      // Persist locally (source of truth).
      ctxAddSectionMessage(chatId, type, role, content);

      // Best-effort server mirror (not required for persistence).
      api.saveSectionMessage(chatId, type, role, content).catch((err) => {
        console.error('Failed to persist section message on server:', err);
      });
    },
    [ctxAddSectionMessage]
  );

  const generateSection = useCallback(
    async (type: SectionType, userRequest?: string) => {
      const { chatId, masterPrompt, conversationHistory } = configRef.current;
      if (!chatId || !masterPrompt) return;

      setSections((prev) => ({
        ...prev,
        [type]: { isGenerating: true, data: prev[type].data, error: null },
      }));

      // Add user message if provided
      if (userRequest) {
        addSectionMessage(type, 'user', userRequest);
      }

      try {
        const response = await api.generateSectionPrompt(type, {
          chatId,
          masterPrompt,
          userRequest,
          conversationHistory,
        });

        setSections((prev) => ({
          ...prev,
          [type]: { isGenerating: false, data: response, error: null },
        }));

        // Normalize fields — sometimes the API returns a single JSON blob
        // in one of the fields containing the full {summary, analysis, masterPrompt}.
        let summary = response.summary || '';
        let analysis = response.analysis || '';
        let masterPromptText = response.masterPrompt || '';

        const tryParseJson = (raw: string): boolean => {
          if (!raw.startsWith('{')) return false;
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && (parsed.summary || parsed.analysis || parsed.masterPrompt)) {
              if (parsed.summary) summary = parsed.summary;
              if (parsed.analysis) analysis = parsed.analysis;
              if (parsed.masterPrompt) masterPromptText = parsed.masterPrompt;
              return true;
            }
          } catch { /* not JSON */ }
          return false;
        };

        // Check each field for a nested JSON blob
        tryParseJson(masterPromptText) || tryParseJson(summary) || tryParseJson(analysis);

        // Build structured content for the renderer
        const assistantContent = JSON.stringify({ summary, analysis, masterPrompt: masterPromptText });

        if (summary || analysis || masterPromptText) {
          addSectionMessage(type, 'assistant', assistantContent);
        }
      } catch (err: any) {
        setSections((prev) => ({
          ...prev,
          [type]: {
            isGenerating: false,
            data: prev[type].data,
            error: err?.message || `Failed to generate ${type} section`,
          },
        }));
      }
    },
    [addSectionMessage]
  );

  return {
    sections,
    sectionMessages,
    activeSection,
    setActiveSection,
    generateSection,
    addSectionMessage,
    loadSectionMessages,
  };
}
