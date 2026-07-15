import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Trash2, BookOpen, PanelLeftClose, Pencil, Check, X } from 'lucide-react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { hoverScaleSmall } from '../../motion/presets';
import type { ChatSession } from '../../types';

interface SidebarProps {
  chats: ChatSession[];
  activeChatId: string | null;
  loading: boolean;
  promptCount: number;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onNewChat: () => void;
  onToggleLibrary: () => void;
  showLibrary: boolean;
}

export default function Sidebar({
  chats,
  activeChatId,
  loading,
  promptCount,
  onSelectChat,
  onDeleteChat,
  onNewChat,
  onToggleLibrary,
  showLibrary,
}: SidebarProps) {
  const reducedMotion = useReducedMotionSafe();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Close sidebar on outside click (mobile)
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleRename = (chatId: string, newTitle: string) => {
    if (newTitle.trim()) {
      // Emit rename event through a callback prop or directly
      const event = new CustomEvent('sidebar:rename', { detail: { chatId, title: newTitle.trim() } });
      window.dispatchEvent(event);
    }
    setEditingId(null);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1
            className="text-[15px] font-semibold text-white tracking-tight"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Prompt Designer
          </h1>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat button */}
        <motion.button
          {...(reducedMotion ? {} : hoverScaleSmall)}
          onClick={() => {
            onNewChat();
            setIsOpen(false);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/70 hover:text-white text-[13px] font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </motion.button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 py-1 min-h-0">
        {loading && (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-white/25">Loading...</p>
          </div>
        )}

        {!loading && chats.length === 0 && (
          <div className="px-4 py-8 text-center">
            <MessageSquare className="w-6 h-6 text-white/15 mx-auto mb-2" />
            <p className="text-[12px] text-white/25 leading-relaxed">
              No chats yet.
              <br />
              Create one to get started.
            </p>
          </div>
        )}

        {chats.map((chat) => {
          const isActive = chat.id === activeChatId;
          const isEditing = chat.id === editingId;

          return (
            <div
              key={chat.id}
              className={`group relative mb-0.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-white/[0.08]'
                  : 'hover:bg-white/[0.04]'
              }`}
            >
              {isEditing ? (
                <div className="flex items-center gap-1 px-3 py-2">
                  <input
                    ref={editInputRef}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(chat.id, editTitle);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onBlur={() => handleRename(chat.id, editTitle)}
                    className="flex-1 min-w-0 bg-white/[0.06] border border-white/[0.1] rounded px-2 py-1 text-[12px] text-white outline-none focus:border-white/20"
                  />
                  <button
                    onClick={() => handleRename(chat.id, editTitle)}
                    className="p-1 rounded text-emerald-400 hover:bg-emerald-400/10"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 rounded text-white/30 hover:text-white/60"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onSelectChat(chat.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-2.5"
                >
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white/60' : 'text-white/25'}`} />
                  <span className={`flex-1 min-w-0 text-[12px] truncate ${
                    isActive ? 'text-white/80' : 'text-white/45'
                  }`}>
                    {chat.title}
                  </span>

                  {/* Actions on hover */}
                  <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(chat.id);
                        setEditTitle(chat.title);
                      }}
                      className="p-1 rounded text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this chat?')) onDeleteChat(chat.id);
                      }}
                      className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Library toggle */}
      <div className="px-4 py-3 border-t border-white/[0.06] shrink-0">
        <button
          onClick={onToggleLibrary}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${
            showLibrary
              ? 'bg-white/[0.08] text-white/70'
              : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Prompt Library
          {promptCount > 0 && (
            <span className="text-[10px] text-white/25 ml-auto">({promptCount})</span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={sidebarRef}
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="md:hidden fixed inset-y-0 left-0 z-50 w-[280px] bg-[#0a0a0f] border-r border-white/[0.06] flex flex-col"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-[280px] shrink-0 h-screen bg-[#0a0a0f] border-r border-white/[0.06] sticky top-0">
        {sidebarContent}
      </div>
    </>
  );
}
