import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Plus, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import MasterPromptSection from '../components/masterPrompt/MasterPromptSection';
import NewChatForm from '../components/masterPrompt/NewChatForm';
import ChatList from '../components/masterPrompt/ChatList';
import Button from '../components/ui/Button';
import { useChats } from '../hooks/useChats';

export default function ChatWorkspace() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const [showLibrary, setShowLibrary] = useState(false);
  const [showNewChatForm, setShowNewChatForm] = useState(false);
  const [chatListOpen, setChatListOpen] = useState(true);

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
    <div className="h-screen w-full flex bg-primary-dark">
      {/* Chat list column (collapsible) */}
      {chatListOpen && (
        <div className="w-[260px] shrink-0 hidden sm:block">
          <ChatList onNewChat={() => setShowNewChatForm(true)} />
        </div>
      )}

      {/* Main workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="shrink-0 px-6 py-4 border-b border-secondary-borderGray flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setChatListOpen(v => !v)}
              className="hidden sm:inline-flex p-1.5 rounded-md text-secondary-midGray hover:text-accent-orange hover:bg-secondary-darkSurface transition-colors"
              aria-label={chatListOpen ? 'Collapse chat list' : 'Expand chat list'}
            >
              {chatListOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            {isInSpecificChat && (
              <button
                onClick={handleBackToList}
                className="p-1.5 rounded-md text-secondary-midGray hover:text-accent-orange hover:bg-secondary-darkSurface transition-colors"
                aria-label="Back to chat list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-heading text-primary-light">Chat Workspace</h1>
          </div>
          {chatsState.chats.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setShowNewChatForm(true)}>
              <Plus className="w-3.5 h-3.5" />
              New Chat
            </Button>
          )}
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
                  onNewChat={() => setShowNewChatForm(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}