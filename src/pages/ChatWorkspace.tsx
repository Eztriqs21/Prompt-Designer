import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import MasterPromptSection from '../components/masterPrompt/MasterPromptSection';
import NewChatForm from '../components/masterPrompt/NewChatForm';
import ChatList from '../components/masterPrompt/ChatList';
import { useChats } from '../hooks/useChats';

export default function ChatWorkspace() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const [showLibrary, setShowLibrary] = useState(false);
  const [showNewChatForm, setShowNewChatForm] = useState(false);

  const chatsState = useChats(chatId || null);

  const handleNewChat = async (formValues: Parameters<typeof chatsState.createNewChat>[0]) => {
    try {
      const newChat = await chatsState.createNewChat(formValues);
      setShowNewChatForm(false);
      if (newChat?.id) {
        navigate(`/chat/${newChat.id}`);
      }
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  const handleBackToList = () => {
    navigate('/chat');
  };

  const isInSpecificChat = !!chatId;

  return (
    <div className="h-screen w-full flex bg-surface-base">
      {/* Chat list column */}
      <div className="w-64 shrink-0 hidden sm:block">
        <ChatList onNewChat={() => setShowNewChatForm(true)} />
      </div>

      {/* Main workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="shrink-0 px-6 py-4 border-b border-border-soft flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewChatForm(true)}
              className="sm:hidden inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-accent-primary text-surface-base rounded-md hover:bg-accent-primary/90 transition-colors"
            >
              New Chat
            </button>
            {isInSpecificChat && (
              <button
                onClick={handleBackToList}
                className="p-1.5 rounded-md text-ink-muted hover:text-accent-primary hover:bg-surface-alt transition-colors"
                aria-label="Back to chat list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-base font-semibold text-ink-primary">Chat Workspace</h1>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 min-h-0 w-full overflow-y-auto">
          <AnimatePresence mode="wait">
            {showNewChatForm ? (
              <motion.div
                key="new-chat-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="max-w-2xl mx-auto p-6">
                  <NewChatForm
                    onSubmit={handleNewChat}
                    onCancel={() => setShowNewChatForm(false)}
                  />
                </div>
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
    </div>
  );
}