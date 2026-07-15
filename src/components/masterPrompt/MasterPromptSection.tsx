import { useLayoutEffect, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Report prompt count to parent
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
      {/* Chat area — always rendered, takes full space */}
      <div className="flex-1 min-h-0">
        {activeChatId ? (
          <ConversationPane
            messages={messages}
            onSend={handleSend}
            onGenerate={handleGenerate}
            disabled={isGenerating}
            isGenerating={isGenerating}
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
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h2
                  className="text-xl text-white/70 tracking-tight mb-1"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Start a conversation
                </h2>
                <p className="text-[13px] text-white/30 max-w-[280px] mx-auto leading-relaxed">
                  Create a new chat or select an existing one to continue where you left off.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prompt Library — slides in from right, overlays chat */}
      <AnimatePresence>
        {showLibrary && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-y-0 right-0 z-30 w-full max-w-md bg-[#07070D]/95 backdrop-blur-xl border-l border-white/[0.06] shadow-2xl overflow-hidden"
          >
            <PromptLibraryPane
              promptVersions={promptVersions}
              isLoading={versionsLoading}
              error={versionsError}
              onPin={handlePin}
              onClone={handleClone}
              onViewPrompt={setViewingPrompt}
              onClose={onToggleLibrary}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full prompt view modal */}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="liquid-glass rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 border-b border-white/[0.06] shrink-0 flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-white">
              v{prompt.version} — {prompt.title}
            </h3>
            <p className="text-[11px] text-white/35 mt-0.5">
              {prompt.isPinned ? 'Pinned' : 'Not pinned'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[12px] text-white/40 hover:text-white/70 transition-colors px-3 py-1.5"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {prompt.summary && (
            <div>
              <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1.5">Summary</p>
              <p className="text-[13px] text-white/60 leading-relaxed">{prompt.summary}</p>
            </div>
          )}
          {prompt.analysis && (
            <div>
              <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1.5">Analysis</p>
              <p className="text-[13px] text-white/60 leading-relaxed">{prompt.analysis}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1.5">Master Prompt</p>
            <pre className="text-[12px] font-mono whitespace-pre-wrap leading-relaxed text-white/75 bg-black/30 border border-white/[0.05] rounded-xl px-4 py-3">
              {prompt.masterPrompt}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
