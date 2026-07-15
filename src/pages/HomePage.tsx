import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import MasterPromptSection from '../components/masterPrompt/MasterPromptSection';
import NewChatForm from '../components/masterPrompt/NewChatForm';
import { useChats } from '../hooks/useChats';
import { useReducedMotionSafe } from '../hooks/useReducedMotionSafe';
import { fadeIn, transitionEnter } from '../motion/presets';

export default function HomePage() {
  const reducedMotion = useReducedMotionSafe();
  const [showLibrary, setShowLibrary] = useState(false);
  const [showNewChatForm, setShowNewChatForm] = useState(false);
  const [promptCount, setPromptCount] = useState(0);

  const chatsState = useChats();

  const handleNewChat = async (formValues: Parameters<typeof chatsState.createNewChat>[0]) => {
    try {
      await chatsState.createNewChat(formValues);
      setShowNewChatForm(false);
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  return (
    <motion.div
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      variants={fadeIn}
      transition={reducedMotion ? { duration: 0 } : transitionEnter}
      className="h-screen bg-black text-white overflow-hidden"
    >
      {/* Content */}
      <div className="relative z-10 flex h-full">
        {/* Sidebar */}
        <Sidebar
          chats={chatsState.chats}
          activeChatId={chatsState.activeChatId}
          loading={chatsState.loading}
          promptCount={promptCount}
          onSelectChat={chatsState.setActiveChat}
          onDeleteChat={chatsState.deleteChat}
          onRenameChat={chatsState.renameChat}
          onNewChat={() => setShowNewChatForm(true)}
          onToggleLibrary={() => setShowLibrary((v) => !v)}
          showLibrary={showLibrary}
        />

        {/* Main area */}
        <main className="flex-1 flex flex-col min-w-0 h-full">
          {/* New chat form modal */}
          <AnimatePresence>
            {showNewChatForm && (
              <motion.div
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
              >
                <motion.div
                  initial={reducedMotion ? false : { scale: 0.96, y: 8 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={reducedMotion ? { opacity: 0 } : { scale: 0.96, y: 8 }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="w-full max-w-lg"
                >
                  <NewChatForm
                    onSubmit={handleNewChat}
                    onCancel={() => setShowNewChatForm(false)}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <MasterPromptSection
            chatsState={chatsState}
            onToggleLibrary={() => setShowLibrary((v) => !v)}
            showLibrary={showLibrary}
            onPromptCountChange={setPromptCount}
          />
        </main>
      </div>
    </motion.div>
  );
}
