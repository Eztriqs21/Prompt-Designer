import { useState, useLayoutEffect, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen } from 'lucide-react';
import ConversationPane from './ConversationPane';
import MasterPromptOutput from './MasterPromptOutput';
import PromptLibraryPane from './PromptLibraryPane';
import NewChatForm from './NewChatForm';
import ChatSelector from './ChatSelector';
import { useChats } from '../../hooks/useChats';
import { useMasterPrompt } from '../../hooks/useMasterPrompt';
import { usePromptLibrary } from '../../hooks/usePromptLibrary';
import { useSectionPrompts } from '../../hooks/useSectionPrompts';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { saveChatMessage } from '../../lib/apiClient';
import {
  fadeInUp,
  staggerContainer,
  hoverScaleSmall,
  transitionEnter,
  transitionFast,
} from '../../motion/presets';
import type { PromptVersion } from '../../types';

export default function MasterPromptSection() {
  const reducedMotion = useReducedMotionSafe();

  const {
    activeChatId,
    chats,
    messagesByChatId,
    promptsByChatId,
    loading: chatsLoading,
    setActiveChat,
    createNewChat,
    addMessage,
    setPrompt,
    deleteChat,
  } = useChats();

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [viewingPrompt, setViewingPrompt] = useState<PromptVersion | null>(null);

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
    error,
    addUserMessage,
    generate,
    clearError,
    resetForChat,
  } = useMasterPrompt(masterPromptConfig);

  const {
    promptVersions,
    isLoading: versionsLoading,
    error: versionsError,
    loadPromptVersions,
    pinPrompt,
    clonePrompt,
  } = usePromptLibrary();

  const {
    sections,
    activeSection,
    setActiveSection,
    generateSection,
  } = useSectionPrompts({
    chatId: activeChatId,
    masterPrompt: generatedPrompt,
    conversationHistory: messages,
  });

  const prevChatIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (activeChatId && activeChatId !== prevChatIdRef.current) {
      prevChatIdRef.current = activeChatId;
      const chatMessages = messagesByChatId[activeChatId] || [];
      const chatPrompt = promptsByChatId[activeChatId] || null;
      resetForChat(chatMessages, chatPrompt);
    }
  }, [activeChatId, messagesByChatId, promptsByChatId, resetForChat]);

  useEffect(() => {
    if (activeChatId) {
      loadPromptVersions(activeChatId);
    }
  }, [activeChatId, loadPromptVersions]);

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

  const handleNewChat = async (formValues: Parameters<typeof createNewChat>[0]) => {
    try {
      await createNewChat(formValues);
      setIsNewChatOpen(false);
    } catch (err) {
      console.error('Failed to create chat:', err);
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
    <div className="space-y-4">
      {/* Header with chat selector, new chat, and library toggle */}
      <motion.div
        variants={staggerContainer}
        {...(reducedMotion ? {} : { initial: 'hidden', animate: 'visible' })}
        className="space-y-3"
      >
        {/* Title */}
        <div className="text-center space-y-1.5">
          <motion.h2
            variants={fadeInUp}
            transition={reducedMotion ? { duration: 0 } : transitionEnter}
            className="text-2xl md:text-3xl text-white tracking-tight"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Master Prompt Designer
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            transition={reducedMotion ? { duration: 0 } : transitionEnter}
            className="text-[13px] text-white/40 max-w-sm mx-auto leading-relaxed"
          >
            Describe your idea. Get a structured prompt for your coding agent.
          </motion.p>
        </div>

        {/* Chat controls */}
        <motion.div
          variants={fadeInUp}
          transition={reducedMotion ? { duration: 0 } : transitionEnter}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <ChatSelector
            chats={chats}
            activeChatId={activeChatId}
            onSelect={setActiveChat}
            onDelete={deleteChat}
          />
          <motion.button
            {...(reducedMotion ? {} : hoverScaleSmall)}
            onClick={() => setIsNewChatOpen((v) => !v)}
            className="liquid-glass rounded-full px-3.5 py-1.5 text-[12px] font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </motion.button>
          {promptVersions.length > 0 && (
            <motion.button
              {...(reducedMotion ? {} : hoverScaleSmall)}
              onClick={() => setShowLibrary((v) => !v)}
              className={`liquid-glass rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors flex items-center gap-1.5 ${
                showLibrary ? 'text-white bg-white/[0.06]' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Library
              <span className="text-[10px] text-white/25">({promptVersions.length})</span>
            </motion.button>
          )}
        </motion.div>
      </motion.div>

      {/* New chat form */}
      <AnimatePresence>
        {isNewChatOpen && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8 }}
            transition={reducedMotion ? { duration: 0 } : transitionFast}
          >
            <NewChatForm
              onSubmit={handleNewChat}
              onCancel={() => setIsNewChatOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      {chatsLoading && (
        <div className="text-center py-8">
          <p className="text-[13px] text-white/30">Loading chats...</p>
        </div>
      )}

      {/* No chats state */}
      {!chatsLoading && chats.length === 0 && !isNewChatOpen && (
        <motion.div
          variants={fadeInUp}
          {...(reducedMotion ? {} : { initial: 'hidden', animate: 'visible' })}
          transition={reducedMotion ? { duration: 0 } : transitionEnter}
          className="text-center py-12"
        >
          <p className="text-[14px] text-white/30 mb-3">No chats yet. Create one to get started.</p>
          <motion.button
            {...(reducedMotion ? {} : hoverScaleSmall)}
            onClick={() => setIsNewChatOpen(true)}
            className="liquid-glass rounded-full px-5 py-2.5 text-[13px] font-medium text-white hover:bg-white/5 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Your First Chat
          </motion.button>
        </motion.div>
      )}

      {/* Prompt Library overlay */}
      <AnimatePresence>
        {showLibrary && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={reducedMotion ? { duration: 0 } : transitionFast}
          >
            <PromptLibraryPane
              promptVersions={promptVersions}
              isLoading={versionsLoading}
              error={versionsError}
              onPin={handlePin}
              onClone={handleClone}
              onViewPrompt={setViewingPrompt}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified chat area */}
      {!chatsLoading && activeChatId && (
        <motion.div
          variants={fadeInUp}
          {...(reducedMotion ? {} : { initial: 'hidden', animate: 'visible' })}
          transition={reducedMotion ? { duration: 0 } : transitionEnter}
        >
          <ConversationPane
            messages={messages}
            onSend={handleSend}
            onGenerate={handleGenerate}
            disabled={isGenerating}
            isGenerating={isGenerating}
          >
            {/* Master prompt output rendered inline in the conversation */}
            {generatedPrompt && !isGenerating && (
              <MasterPromptOutput
                summary={generatedSummary}
                analysis={generatedAnalysis}
                masterPrompt={generatedPrompt}
                sections={sections}
                activeSection={activeSection}
                onSelectSection={setActiveSection}
                onGenerateSection={generateSection}
              />
            )}
          </ConversationPane>
        </motion.div>
      )}

      {/* Full prompt view modal */}
      <AnimatePresence>
        {viewingPrompt && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' }}
              className="liquid-glass rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
            >
              <div className="px-5 py-4 border-b border-white/[0.06] shrink-0 flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold text-white">
                    v{viewingPrompt.version} — {viewingPrompt.title}
                  </h3>
                  <p className="text-[11px] text-white/35 mt-0.5">
                    {viewingPrompt.isPinned ? 'Pinned' : 'Not pinned'}
                  </p>
                </div>
                <motion.button
                  whileHover={reducedMotion ? {} : { scale: 1.05 }}
                  whileTap={reducedMotion ? {} : { scale: 0.95 }}
                  onClick={() => setViewingPrompt(null)}
                  className="text-[12px] text-white/40 hover:text-white/70 transition-colors px-3 py-1.5"
                >
                  Close
                </motion.button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
                {viewingPrompt.summary && (
                  <div>
                    <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1.5">Summary</p>
                    <p className="text-[13px] text-white/60 leading-relaxed">{viewingPrompt.summary}</p>
                  </div>
                )}
                {viewingPrompt.analysis && (
                  <div>
                    <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1.5">Analysis</p>
                    <p className="text-[13px] text-white/60 leading-relaxed">{viewingPrompt.analysis}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1.5">Master Prompt</p>
                  <pre className="text-[12px] font-mono whitespace-pre-wrap leading-relaxed text-white/75 bg-black/30 border border-white/[0.05] rounded-xl px-4 py-3">
                    {viewingPrompt.masterPrompt}
                  </pre>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
