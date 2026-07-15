import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import MasterPromptSection from '../components/masterPrompt/MasterPromptSection';
import NewChatForm from '../components/masterPrompt/NewChatForm';
import { useChats } from '../hooks/useChats';

export default function ChatWorkspace() {
  const [showLibrary, setShowLibrary] = useState(false);
  const [showNewChatForm, setShowNewChatForm] = useState(false);

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
    <div className="h-screen w-full flex flex-col bg-surface-base">
      {/* Header */}
      <header className="shrink-0 px-6 py-4 border-b border-border-soft flex items-center justify-between">
        <h1 className="text-base font-semibold text-ink-primary">Chat Workspace</h1>
        <button
          onClick={() => setShowNewChatForm(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-accent-primary text-surface-base rounded-md hover:bg-accent-primary/90 transition-colors duration-150"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 w-full">
        <AnimatePresence mode="wait">
          {showNewChatForm ? (
            <motion.div
              key="new-chat-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full flex items-center justify-center p-6"
            >
              <NewChatForm
                onSubmit={handleNewChat}
                onCancel={() => setShowNewChatForm(false)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="workspace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <MasterPromptSection
                chatsState={chatsState}
                onToggleLibrary={() => setShowLibrary((v) => !v)}
                showLibrary={showLibrary}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
