import { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check, Code, Palette, ShieldCheck, Loader2, User, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SectionType, SectionState } from '../../types';
import type { SectionMessage } from '../../lib/apiClient';
import SectionContentRenderer from './SectionContentRenderer';

interface SectionConversationProps {
  sectionType: SectionType;
  state: SectionState;
  messages: SectionMessage[];
  onGenerate: (userRequest?: string) => void;
  onLoadMessages: () => Promise<void>;
  compact?: boolean;
  headerOnly?: boolean;
}

const SECTION_META: Record<SectionType, { label: string; icon: typeof Code; color: string }> = {
  coding: { label: 'Coding', icon: Code, color: 'text-accent-orange' },
  'ui-ux': { label: 'UI/UX', icon: Palette, color: 'text-accent-orange' },
  audit: { label: 'Audit', icon: ShieldCheck, color: 'text-secondary-midGray' },
};

export default function SectionConversation({ sectionType, state, messages, onGenerate, onLoadMessages, compact, headerOnly }: SectionConversationProps) {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const meta = SECTION_META[sectionType];
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      onLoadMessages();
    }
  }, [onLoadMessages]);

  useEffect(() => {
    loadedRef.current = false;
  }, [sectionType]);

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

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const handleSend = () => {
    if (!input.trim() || state.isGenerating) return;
    const request = input.trim();
    setInput('');
    onGenerate(request);
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

  // Header-only mode: compact bar with status, no content
  if (headerOnly) {
    const hasData = !!state.data;
    const isWorking = state.isGenerating;
    return (
      <div className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <meta.icon className={`w-4 h-4 ${meta.color}`} />
          <span className="text-small font-semibold tracking-wide uppercase text-secondary-midGray">
            {meta.label}
          </span>
          <span className={`w-2 h-2 rounded-full ${isWorking ? 'bg-accent-orange animate-pulse' : hasData ? 'bg-success-green' : 'bg-secondary-midGray'}`} />
          <span className="text-small text-secondary-midGray">
            {isWorking ? 'Working' : hasData ? 'Done' : 'Idle'}
          </span>
        </div>
        <button
          onClick={() => setFullscreen(true)}
          aria-label={`${meta.label} section fullscreen`}
          className="p-1.5 rounded-md bg-primary-dark border border-secondary-borderGray text-secondary-midGray hover:text-accent-orange transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const card = (
    <div className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} border-b border-secondary-borderGray shrink-0 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <meta.icon className={`w-4 h-4 ${meta.color}`} />
          <h3 className="text-small font-semibold tracking-wide uppercase text-secondary-midGray">
            {meta.label} Section
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {!compact && state.data && (
            <button
              onClick={() => handleCopy(state.data!.masterPrompt)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-small font-medium rounded-md bg-primary-dark border border-secondary-borderGray text-secondary-midGray hover:text-primary-light transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-success-green" />
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
          <button
            onClick={() => setFullscreen((v) => !v)}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-md bg-primary-dark border border-secondary-borderGray text-secondary-midGray hover:text-accent-orange transition-colors"
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto ${compact ? 'px-4 py-4' : 'px-4 py-4'} space-y-4 min-h-0`} ref={scrollRef}>
        {messages.length === 0 && !state.isGenerating && !state.error && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <div className="inline-flex p-3 rounded-md bg-primary-dark border border-secondary-borderGray">
              <meta.icon className={`w-5 h-5 ${meta.color}`} />
            </div>
            <p className="text-body text-secondary-midGray max-w-[36ch] leading-relaxed">
              Describe what you want from the {meta.label.toLowerCase()} section and send it, or generate a baseline below.
            </p>
            <button
              onClick={() => onGenerate()}
              disabled={state.isGenerating}
              className="px-4 py-2 text-small font-medium rounded-md bg-primary-dark border border-secondary-borderGray text-secondary-midGray hover:text-accent-orange hover:border-accent-orange/30 transition-colors disabled:opacity-30"
            >
              Generate {meta.label} Section
            </button>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-2.5">
              {msg.role === 'assistant' ? (
                <div className="p-1.5 rounded-md bg-primary-dark border border-secondary-borderGray shrink-0">
                  <meta.icon className={`w-3.5 h-3.5 ${meta.color}`} />
                </div>
              ) : (
                <div className="p-1.5 rounded-md bg-secondary-darkSurface border border-secondary-borderGray shrink-0">
                  <User className="w-3.5 h-3.5 text-accent-orange" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-small font-medium text-secondary-midGray mb-1">
                  {msg.role === 'assistant' ? meta.label : 'You'}
                </p>
                {msg.role === 'assistant' ? (
                  <SectionContentRenderer content={msg.content} />
                ) : (
                  <div className="text-body text-primary-light leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {state.isGenerating && (
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-md bg-primary-dark border border-secondary-borderGray shrink-0">
              <Loader2 className={`w-3.5 h-3.5 animate-spin ${meta.color}`} />
            </div>
            <div>
              <p className="text-small font-medium text-secondary-midGray mb-1">{meta.label}</p>
              <p className="text-body text-secondary-midGray">Generating...</p>
            </div>
          </div>
        )}

        {state.error && (
          <div className="p-3 rounded-md bg-semantic-dangerRed/10 border border-semantic-dangerRed/20">
            <p className="text-small text-semantic-dangerRed">{state.error}</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`shrink-0 ${compact ? 'px-3 py-2' : 'px-4 py-3'} border-t border-secondary-borderGray`}>
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about the ${meta.label.toLowerCase()} section...`}
            rows={1}
            className="flex-1 min-w-0 bg-primary-dark border border-secondary-borderGray rounded-md px-3 py-2 text-body text-primary-light placeholder:text-secondary-midGray resize-none outline-none focus:border-accent-orange/30 transition-colors disabled:opacity-40"
            disabled={state.isGenerating}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || state.isGenerating}
            className="p-2 rounded-md bg-primary-light text-primary-dark hover:bg-primary-light/90 transition-colors disabled:opacity-30 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <AnimatePresence>
        <motion.div
          key="section-fullscreen"
          className="fixed inset-0 z-50 bg-primary-dark flex p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <motion.div
            className="w-full"
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ height: 'calc(100vh - 32px)' }}
          >
            {card}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return <div className="w-full h-full">{card}</div>;
}
