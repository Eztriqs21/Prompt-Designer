import { useState, useCallback, useRef, useEffect } from 'react';
import type { SectionType, SectionPromptResponse, SectionState, Message } from '../types';
import * as api from '../lib/apiClient';

interface UseSectionPromptsConfig {
  chatId: string | null;
  masterPrompt: string | null;
  conversationHistory: Message[];
}

interface UseSectionPromptsReturn {
  sections: Record<SectionType, SectionState>;
  activeSection: SectionType | null;
  setActiveSection: (type: SectionType | null) => void;
  generateSection: (type: SectionType, userRequest?: string) => Promise<void>;
}

const STORAGE_KEY_PREFIX = 'promptDesigner_sections_';

function loadPersistedSections(chatId: string): Record<SectionType, SectionPromptResponse | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + chatId);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { coding: null, 'ui-ux': null, audit: null };
}

function persistSections(chatId: string, data: Record<SectionType, SectionPromptResponse | null>): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + chatId, JSON.stringify(data));
  } catch {}
}

function createEmptyState(): Record<SectionType, SectionState> {
  return {
    coding: { isGenerating: false, data: null, error: null },
    'ui-ux': { isGenerating: false, data: null, error: null },
    audit: { isGenerating: false, data: null, error: null },
  };
}

export function useSectionPrompts(config: UseSectionPromptsConfig): UseSectionPromptsReturn {
  const [sections, setSections] = useState<Record<SectionType, SectionState>>(createEmptyState);
  const [activeSection, setActiveSection] = useState<SectionType | null>(null);

  const configRef = useRef(config);
  configRef.current = config;

  const chatIdRef = useRef<string | null>(null);

  // Load persisted sections when chat changes
  useEffect(() => {
    const chatId = config.chatId;
    if (!chatId) {
      setSections(createEmptyState());
      chatIdRef.current = null;
      return;
    }

    if (chatId === chatIdRef.current) return;
    chatIdRef.current = chatId;

    const persisted = loadPersistedSections(chatId);
    setSections({
      coding: { isGenerating: false, data: persisted.coding, error: null },
      'ui-ux': { isGenerating: false, data: persisted['ui-ux'], error: null },
      audit: { isGenerating: false, data: persisted.audit, error: null },
    });
  }, [config.chatId]);

  const generateSection = useCallback(async (type: SectionType, userRequest?: string) => {
    const { chatId, masterPrompt, conversationHistory } = configRef.current;
    if (!chatId || !masterPrompt) return;

    setSections((prev) => ({
      ...prev,
      [type]: { isGenerating: true, data: prev[type].data, error: null },
    }));

    try {
      const response = await api.generateSectionPrompt(type, {
        chatId,
        masterPrompt,
        userRequest,
        conversationHistory,
      });

      setSections((prev) => {
        const next = {
          ...prev,
          [type]: { isGenerating: false, data: response, error: null },
        };
        // Persist to localStorage
        persistSections(chatId, {
          coding: next.coding.data,
          'ui-ux': next['ui-ux'].data,
          audit: next.audit.data,
        });
        return next;
      });
    } catch (err: any) {
      setSections((prev) => ({
        ...prev,
        [type]: {
          isGenerating: false,
          data: prev[type].data,
          error: err.message || `Failed to generate ${type} section`,
        },
      }));
    }
  }, []);

  return {
    sections,
    activeSection,
    setActiveSection,
    generateSection,
  };
}
