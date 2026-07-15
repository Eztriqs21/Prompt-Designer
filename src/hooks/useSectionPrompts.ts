import { useState, useCallback, useRef, useEffect } from 'react';
import type { SectionType, SectionState, Message } from '../types';
import * as api from '../lib/apiClient';
import type { SectionMessage } from '../lib/apiClient';

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

function createEmptyMessages(): Record<SectionType, SectionMessage[]> {
  return { coding: [], 'ui-ux': [], audit: [] };
}

export function useSectionPrompts(config: UseSectionPromptsConfig): UseSectionPromptsReturn {
  const [sections, setSections] = useState<Record<SectionType, SectionState>>(createEmptyState);
  const [sectionMessages, setSectionMessages] = useState<Record<SectionType, SectionMessage[]>>(createEmptyMessages);
  const [activeSection, setActiveSection] = useState<SectionType | null>(null);

  const configRef = useRef(config);
  configRef.current = config;

  const chatIdRef = useRef<string | null>(null);

  // Load persisted sections when chat changes
  useEffect(() => {
    const chatId = config.chatId;
    if (!chatId) {
      setSections(createEmptyState());
      setSectionMessages(createEmptyMessages());
      chatIdRef.current = null;
      return;
    }

    if (chatId === chatIdRef.current) return;
    chatIdRef.current = chatId;

    setSections(createEmptyState());
    setSectionMessages(createEmptyMessages());
  }, [config.chatId]);

  const loadSectionMessages = useCallback(async (chatId: string, sectionType: SectionType) => {
    try {
      const messages = await api.getSectionMessages(chatId, sectionType);
      setSectionMessages((prev) => ({ ...prev, [sectionType]: messages }));
    } catch (err) {
      console.error('Failed to load section messages:', err);
    }
  }, []);

  const addSectionMessage = useCallback((type: SectionType, role: 'user' | 'assistant', content: string) => {
    const chatId = configRef.current.chatId;
    if (!chatId) return;

    const msg: SectionMessage = {
      id: `section-${Date.now()}-${Math.random()}`,
      chatId,
      sectionType: type,
      role,
      content,
      timestamp: Date.now(),
    };

    setSectionMessages((prev) => ({ ...prev, [type]: [...prev[type], msg] }));

    // Persist to backend (fire and forget)
    api.saveSectionMessage(chatId, type, role, content).catch((err) => {
      console.error('Failed to persist section message:', err);
    });
  }, []);

  const generateSection = useCallback(async (type: SectionType, userRequest?: string) => {
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

      // Add assistant message with the generated content
      const assistantContent = [
        response.summary ? `Summary: ${response.summary}` : '',
        response.analysis ? `Analysis: ${response.analysis}` : '',
        response.masterPrompt ? `\nMaster Prompt:\n${response.masterPrompt}` : '',
      ].filter(Boolean).join('\n\n');

      if (assistantContent) {
        addSectionMessage(type, 'assistant', assistantContent);
      }
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
  }, [addSectionMessage]);

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
