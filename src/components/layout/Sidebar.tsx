import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Trash2, BookOpen, PanelLeftClose, Pencil, Check, X, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { hoverScaleSmall } from '../../motion/presets';
import type { ChatSession } from '../../types';
import ConfirmModal from './ConfirmModal';

interface SidebarProps {
  chats: ChatSession[];
  activeChatId: string | null;
  loading: boolean;
  promptCount: number;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
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
  onRenameChat,
  onNewChat,
  onToggleLibrary,
  showLibrary,
}: SidebarProps) {
  const reducedMotion = useReducedMotionSafe();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

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
      onRenameChat(chatId, newTitle.trim());
    }
    setEditingId(null);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/[0.08]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400/80" />
            </div>
            <h1
              className="text-[15px] font-semibold text-white/90 tracking-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Prompt Designer
            </h1>
          </div>
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
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-white/80 hover:text-white text-[13px] font-medium transition-all duration-200 border border-white/[0.06] hover:border-white/[0.12]"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </motion.button>

        {/* Website AUDIT link */}
        <Link
          to="/audit"
          onClick={() => setIsOpen(false)}
          className={`mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 border ${
            location.pathname === '/audit'
              ? 'bg-indigo-500/15 border-indigo-500/25 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.08)]'
              : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.06] hover:border-white/[0.1]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Website AUDIT
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
        {loading && (
          <div className="px-4 py-8 text-center">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[11px] text-white/25">Loading chats...</p>
          </div>
        )}

        {!loading && chats.length === 0 && (
          <div className="px-4 py-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-4 h-4 text-white/15" />
            </div>
            <p className="text-[12px] text-white/30 leading-relaxed">
              No chats yet.
            </p>
            <p className="text-[11px] text-white/15 mt-1">
              Start a new conversation
            </p>
          </div>
        )}

        {chats.map((chat) => {
          const isActive = chat.id === activeChatId;
          const isEditing = chat.id === editingId;

          return (
            <div
              key={chat.id}
              className={`group relative mb-0.5 rounded-lg transition-all duration-150 ${
                isActive
                  ? 'bg-white/[0.08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
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
                    className="flex-1 min-w-0 bg-white/[0.06] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
                  />
                  <button
                    onClick={() => handleRename(chat.id, editTitle)}
                    className="p-1 rounded-md text-emerald-400 hover:bg-emerald-400/10"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 rounded-md text-white/30 hover:text-white/60"
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
                  className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 group/item"
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? 'bg-white/[0.08]' : 'bg-white/[0.03] group-hover/item:bg-white/[0.06]'
                  }`}>
                    <MessageSquare className={`w-3 h-3 ${isActive ? 'text-white/60' : 'text-white/25'}`} />
                  </div>
                  <span className={`flex-1 min-w-0 text-[12px] truncate transition-colors ${
                    isActive ? 'text-white/80' : 'text-white/45 group-hover/item:text-white/60'
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
                      className="p-1 rounded-md text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(chat.id);
                      }}
                      className="p-1 rounded-md text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
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
      <div className="px-3 py-3 shrink-0">
        <div className="mx-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-3" />
        <button
          onClick={onToggleLibrary}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 ${
            showLibrary
              ? 'bg-white/[0.08] text-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
              : 'text-white/35 hover:text-white/55 hover:bg-white/[0.04]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Prompt Library
          {promptCount > 0 && (
            <span className="text-[10px] text-white/25 ml-auto bg-white/[0.04] px-1.5 py-0.5 rounded-full">({promptCount})</span>
          )}
        </button>
      </div>
    </div>
  );

  const chatToDelete = chats.find(c => c.id === deletingId);

  return (
    <>
      <ConfirmModal
        open={!!deletingId}
        title="Delete chat"
        message={`Delete "${chatToDelete?.title ?? ''}"? This cannot be undone.`}
        onConfirm={() => {
          if (deletingId) onDeleteChat(deletingId);
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white transition-colors backdrop-blur-sm border border-white/[0.06]"
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
            className="md:hidden fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col"
            style={{ background: 'linear-gradient(180deg, rgba(10,10,15,0.98) 0%, rgba(8,8,12,0.99) 100%)', backdropFilter: 'blur(20px)' }}
          >
            <div className="absolute inset-0 border-r border-white/[0.06] pointer-events-none" />
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div
        className="hidden md:flex flex-col w-[280px] shrink-0 h-screen sticky top-0"
        style={{ background: 'linear-gradient(180deg, rgba(10,10,15,0.95) 0%, rgba(8,8,12,0.98) 100%)', backdropFilter: 'blur(20px)' }}
      >
        <div className="absolute inset-0 border-r border-white/[0.06] pointer-events-none" />
        {sidebarContent}
      </div>
    </>
  );
}
