import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, MessageSquare, Pencil } from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';

interface ChatListProps {
  onNewChat: () => void;
}

function previewOf(content: string | undefined): string {
  if (!content) return 'No messages yet';
  const text = content.replace(/\s+/g, ' ').trim();
  return text.length > 42 ? `${text.slice(0, 42)}…` : text;
}

export default function ChatList({ onNewChat }: ChatListProps) {
  const { chats, activeChatId, messagesByChatId, deleteChat, renameChat, setActiveChat } = useChatContext();
  const navigate = useNavigate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const openChat = (id: string) => {
    setActiveChat(id);
    navigate(`/chat/${id}`);
  };

  const startRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditValue(currentTitle);
  };

  const commitRename = (id: string) => {
    const next = editValue.trim();
    if (next) renameChat(id, next);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this chat and all its prompts? This cannot be undone.')) {
      deleteChat(id);
      if (activeChatId === id) navigate('/chat');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-surface-alt border-r border-border-soft">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border-soft shrink-0">
        <button
          onClick={onNewChat}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-accent-primary text-surface-base rounded-md hover:bg-accent-primary/90 transition-colors duration-150"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 min-h-0">
        {chats.length === 0 ? (
          <p className="text-xs text-ink-muted text-center px-3 py-8 leading-relaxed">
            No chats yet. Start a new chat to design your first prompt.
          </p>
        ) : (
          chats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const lastMsg = (messagesByChatId[chat.id] || [])[messagesByChatId[chat.id]?.length - 1];
            return (
              <div
                key={chat.id}
                className={`group flex items-start gap-2.5 rounded-md px-3 py-2.5 cursor-pointer transition-colors ${
                  isActive ? 'bg-surface-hover text-ink-primary' : 'text-ink-muted hover:bg-surface-base hover:text-ink-primary'
                }`}
                onClick={() => openChat(chat.id)}
              >
                <div className="w-7 h-7 rounded-md bg-surface-base border border-border-soft flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="w-3.5 h-3.5 text-ink-muted/70" />
                </div>

                <div className="flex-1 min-w-0">
                  {editingId === chat.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitRename(chat.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(chat.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-surface-base border border-border-soft rounded px-2 py-1 text-sm text-ink-primary outline-none focus:border-accent-primary/40"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-medium truncate">{chat.title}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(chat.id, chat.title);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-ink-muted hover:text-accent-primary transition-opacity shrink-0"
                        aria-label="Rename chat"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-ink-muted truncate mt-0.5">{previewOf(lastMsg?.content)}</p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(chat.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-ink-muted hover:text-accent-error transition-opacity shrink-0"
                  aria-label="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
