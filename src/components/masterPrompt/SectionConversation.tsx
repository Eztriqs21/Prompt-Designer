import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Copy, Check, Code, Palette, ShieldCheck, Loader2, User } from 'lucide-react';
import type { SectionType, SectionState } from '../../types';

interface SectionConversationProps {
  sectionType: SectionType;
  state: SectionState;
  onGenerate: (userRequest?: string) => void;
}

const SECTION_META: Record<SectionType, { label: string; icon: typeof Code; color: string }> = {
  coding: { label: 'Coding', icon: Code, color: 'text-emerald-400' },
  'ui-ux': { label: 'UI/UX', icon: Palette, color: 'text-violet-400' },
  audit: { label: 'Audit', icon: ShieldCheck, color: 'text-amber-400' },
};

interface SectionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function SectionConversation({ sectionType, state, onGenerate }: SectionConversationProps) {
  const [messages, setMessages] = useState<SectionMessage[]>([]);
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const meta = SECTION_META[sectionType];

  // Initialize with section data when it first loads
  useEffect(() => {
    if (state.data && messages.length === 0) {
      const initialMessage: SectionMessage = {
        id: 'section-data',
        role: 'assistant',
        content: formatSectionData(state.data),
        timestamp: Date.now(),
      };
      setMessages([initialMessage]);
    }
  }, [state.data]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 72)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: SectionMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Trigger regeneration with the user's request
    onGenerate(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Update messages when new section data arrives
  useEffect(() => {
    if (state.data && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      // If the last message was a user message, add the new assistant response
      if (lastMsg.role === 'user' && lastMsg.id !== 'section-data') {
        const assistantMsg: SectionMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: formatSectionData(state.data),
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    }
  }, [state.data]);

  if (!state.data && !state.isGenerating) {
    return (
      <div className="liquid-glass rounded-xl p-6 text-center">
        <div className={`inline-flex p-3 rounded-xl bg-white/[0.04] mb-3`}>
          <meta.icon className={`w-5 h-5 ${meta.color}`} />
        </div>
        <p className="text-[13px] text-white/40 mb-3">
          Generate a {meta.label.toLowerCase()} section prompt to get started.
        </p>
        <button
          onClick={() => onGenerate()}
          className="px-4 py-2 text-[12px] font-medium rounded-lg bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors"
        >
          Generate {meta.label} Section
        </button>
      </div>
    );
  }

  return (
    <div className="liquid-glass rounded-xl flex flex-col" style={{ height: 'min(500px, 60vh)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <meta.icon className={`w-4 h-4 ${meta.color}`} />
          <h3 className="text-[12px] font-semibold tracking-wide uppercase text-white/60">
            {meta.label} Section
          </h3>
        </div>
        {state.data && (
          <button
            onClick={() => handleCopy(state.data!.masterPrompt)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0" ref={scrollRef}>
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2.5"
            >
              {msg.role === 'assistant' ? (
                <div className={`p-1.5 rounded-lg bg-white/[0.04]`}>
                  <meta.icon className={`w-3.5 h-3.5 ${meta.color}`} />
                </div>
              ) : (
                <div className="p-1.5 rounded-lg bg-white/[0.06]">
                  <User className="w-3.5 h-3.5 text-white/50" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-white/30 mb-1">
                  {msg.role === 'assistant' ? meta.label : 'You'}
                </p>
                <div className="text-[13px] text-white/60 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {state.isGenerating && (
          <div className="flex items-start gap-2.5">
            <div className={`p-1.5 rounded-lg bg-white/[0.04]`}>
              <Loader2 className={`w-3.5 h-3.5 animate-spin ${meta.color}`} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-white/30 mb-1">{meta.label}</p>
              <p className="text-[13px] text-white/40">Generating...</p>
            </div>
          </div>
        )}

        {state.error && (
          <div className="p-3 rounded-lg bg-red-500/[0.06] border border-red-500/10">
            <p className="text-[12px] text-red-400">{state.error}</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-white/[0.06]">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about the ${meta.label.toLowerCase()} section...`}
            rows={1}
            className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/20 resize-none outline-none focus:border-white/[0.15] transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || state.isGenerating}
            className="p-2 rounded-lg bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-30 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatSectionData(data: { summary: string; analysis: string; masterPrompt: string }): string {
  const parts: string[] = [];
  if (data.summary) parts.push(`Summary: ${data.summary}`);
  if (data.analysis) parts.push(`Analysis: ${data.analysis}`);
  if (data.masterPrompt) parts.push(`\nMaster Prompt:\n${data.masterPrompt}`);
  return parts.join('\n\n');
}
