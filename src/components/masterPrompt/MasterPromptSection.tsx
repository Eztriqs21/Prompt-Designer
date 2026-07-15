import { useLayoutEffect, useRef, useMemo, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import ConversationPane from './ConversationPane';
import MasterPromptOutput from './MasterPromptOutput';
import PromptLibraryPane from './PromptLibraryPane';
import { useMasterPrompt } from '../../hooks/useMasterPrompt';
import { usePromptLibrary } from '../../hooks/usePromptLibrary';
import { useSectionPrompts } from '../../hooks/useSectionPrompts';
import { saveChatMessage } from '../../lib/apiClient';
import type { ChatSession, Message, MasterPromptResponse } from '../../types';
import type { PromptVersion } from '../../types';

interface ChatsState {
  activeChatId: string | null;
  chats: ChatSession[];
  messagesByChatId: Record<string, Message[]>;
  promptsByChatId: Record<string, MasterPromptResponse | null>;
  loading: boolean;
  setActiveChat: (chatId: string) => void;
  createNewChat: (form: any) => Promise<any>;
  renameChat: (chatId: string, title: string) => Promise<void>;
  addMessage: (chatId: string, message: Message) => void;
  setPrompt: (chatId: string, response: MasterPromptResponse) => void;
  deleteChat: (chatId: string) => Promise<void>;
  loadChatData: (chatId: string) => Promise<void>;
}

interface MasterPromptSectionProps {
  chatsState: ChatsState;
  onToggleLibrary: () => void;
  showLibrary: boolean;
  onPromptCountChange?: (count: number) => void;
}

export default function MasterPromptSection({ chatsState, onToggleLibrary, showLibrary, onPromptCountChange }: MasterPromptSectionProps) {
  const {
    activeChatId,
    chats,
    messagesByChatId,
    promptsByChatId,
    setActiveChat,
    addMessage,
    setPrompt,
  } = chatsState;

  const activeChat = chats.find((c) => c.id === activeChatId);
  const presetKey = activeChat?.presetKey;
  const metadata = activeChat?.metadata;

  const masterPromptConfig = useMemo(
    () => ({ chatId: activeChatId, presetKey, metadata }),
    [activeChatId, presetKey, metadata]
  );

  const {
    messages,
    isGenerating,
    generatedPrompt,
    generatedSummary,
    generatedAnalysis,
    addUserMessage,
    generate,
    resetForChat,
    error,
    clearError,
  } = useMasterPrompt(masterPromptConfig);

  const {
    promptVersions,
    isLoading: versionsLoading,
    error: versionsError,
    loadPromptVersions,
    pinPrompt,
    clonePrompt,
    setViewingPrompt,
    viewingPrompt,
  } = usePromptLibrary();

  const {
    sections,
    sectionMessages,
    activeSection,
    setActiveSection,
    generateSection,
    loadSectionMessages,
  } = useSectionPrompts({
    chatId: activeChatId,
    masterPrompt: generatedPrompt,
    conversationHistory: messages,
  });

  const prevChatIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (activeChatId !== prevChatIdRef.current) {
      prevChatIdRef.current = activeChatId;
      if (activeChatId) {
        const chatMessages = messagesByChatId[activeChatId] || [];
        const chatPrompt = promptsByChatId[activeChatId] || null;
        resetForChat(chatMessages, chatPrompt);
      } else {
        resetForChat([], null);
      }
    }
  }, [activeChatId, messagesByChatId, promptsByChatId, resetForChat]);

  useEffect(() => {
    if (activeChatId) {
      loadPromptVersions(activeChatId);
    }
  }, [activeChatId, loadPromptVersions]);

  useEffect(() => {
    onPromptCountChange?.(promptVersions.length);
  }, [promptVersions.length, onPromptCountChange]);

  const handleSend = async (content: string) => {
    if (!activeChatId) return;
    const msg = addUserMessage(content);
    if (msg) {
      addMessage(activeChatId, msg);
      try {
        await saveChatMessage(activeChatId, 'user', content);
      } catch (err) {
        console.error('Failed to persist user message:', err);
      }
    }
  };

  const handleGenerate = async (idea: string) => {
    if (!activeChatId) return;
    clearError();
    const response = await generate(idea);
    if (response) {
      setPrompt(activeChatId, response);
      loadPromptVersions(activeChatId);
    }
  };

  const handlePin = async (promptId: string) => {
    if (!activeChatId) return;
    await pinPrompt(activeChatId, promptId);
  };

  const handleClone = async (promptId: string) => {
    const newChatId = await clonePrompt(promptId);
    if (newChatId) {
      setActiveChat(newChatId);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 relative overflow-hidden">
      <div className="flex-1 min-h-0">
        {activeChatId ? (
          <ConversationPane
            messages={messages}
            onSend={handleSend}
            onGenerate={handleGenerate}
            disabled={isGenerating}
            isGenerating={isGenerating}
            error={error}
          >
            {generatedPrompt && !isGenerating && (
              <MasterPromptOutput
                summary={generatedSummary}
                analysis={generatedAnalysis}
                masterPrompt={generatedPrompt}
                sections={sections}
                sectionMessages={sectionMessages}
                activeSection={activeSection}
                onSelectSection={setActiveSection}
                onGenerateSection={generateSection}
                chatId={activeChatId}
                onLoadSectionMessages={loadSectionMessages}
              />
            )}
          </ConversationPane>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center space-y-4 px-6">
              <div className="w-16 h-16 rounded-md bg-surface-alt border border-border-soft flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-ink-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-ink-primary tracking-tight mb-1">
                  Start a conversation
                </h2>
                <p className="text-sm text-ink-muted max-w-[280px] mx-auto leading-relaxed">
                  Create a new chat or select an existing one to continue where you left off.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showLibrary && (
          <div className="absolute inset-y-0 right-0 z-30 w-full max-w-md bg-surface-base border-l border-border-soft shadow-md overflow-hidden">
            <PromptLibraryPane
              promptVersions={promptVersions}
              isLoading={versionsLoading}
              error={versionsError}
              onPin={handlePin}
              onClone={handleClone}
              onViewPrompt={setViewingPrompt}
              onClose={onToggleLibrary}
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingPrompt && (
          <PromptViewModal prompt={viewingPrompt} onClose={() => setViewingPrompt(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function PromptViewModal({ prompt, onClose }: { prompt: PromptVersion; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink-primary/20">
      <div className="bg-surface-base border border-border-soft rounded-md shadow-md w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 border-b border-border-soft shrink-0 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink-primary">
              v{prompt.version} ÔÇö {prompt.title}
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              {prompt.isPinned ? 'Pinned' : 'Not pinned'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-ink-muted hover:text-ink-primary transition-colors px-3 py-1.5"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {prompt.summary && (
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-ink-muted mb-1.5">Summary</p>
              <p className="text-sm text-ink-primary leading-relaxed">{prompt.summary}</p>
            </div>
          )}
          {prompt.analysis && (
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-ink-muted mb-1.5">Analysis</p>
              <p className="text-sm text-ink-primary leading-relaxed">{prompt.analysis}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-ink-muted mb-1.5">Master Prompt</p>
            <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-ink-primary bg-surface-alt border border-border-soft rounded-md px-4 py-3">
              {prompt.masterPrompt}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
