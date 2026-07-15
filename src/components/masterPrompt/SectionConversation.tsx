import { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check, Code, Palette, ShieldCheck, Loader2, User } from 'lucide-react';
import type { SectionType, SectionState } from '../../types';
import type { SectionMessage } from '../../lib/apiClient';

interface SectionConversationProps {
  sectionType: SectionType;
  state: SectionState;
  messages: SectionMessage[];
  onGenerate: (userRequest?: string) => void;
  onLoadMessages: () => Promise<void>;
}

const SECTION_META: Record<SectionType, { label: string; icon: typeof Code; color: string }> = {
  coding: { label: 'Coding', icon: Code, color: 'text-accent-success' },
  'ui-ux': { label: 'UI/UX', icon: Palette, color: 'text-accent-info' },
  audit: { label: 'Audit', icon: ShieldCheck, color: 'text-accent-warning' },
};

export default function SectionConversation({ sectionType, state, messages, onGenerate, onLoadMessages }: SectionConversationProps) {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
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

  const handleSend = () => {
    if (!input.trim()) return;
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

  if (!state.data && !state.isGenerating) {
    return (
      <div className="bg-surface-alt border border-border-soft rounded-md p-6 text-center">
        <div className="inline-flex p-3 rounded-md bg-surface-base border border-border-soft mb-3">
          <meta.icon className={`w-5 h-5 ${meta.color}`} />
        </div>
        <p className="text-sm text-ink-muted mb-3">
          Generate a {meta.label.toLowerCase()} section prompt to get started.
        </p>
        <button
          onClick={() => onGenerate()}
          className="px-4 py-2 text-xs font-medium rounded-md bg-surface-base border border-border-soft text-ink-muted hover:text-ink-primary hover:bg-surface-alt transition-colors"
        >
          Generate {meta.label} Section
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface-alt border border-border-soft rounded-md flex flex-col" style={{ height: 'min(500px, 60vh)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-soft shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <meta.icon className={`w-4 h-4 ${meta.color}`} />
          <h3 className="text-xs font-semibold tracking-wide uppercase text-ink-muted">
            {meta.label} Section
          </h3>
        </div>
        {state.data && (
          <button
            onClick={() => handleCopy(state.data!.masterPrompt)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-surface-base border border-border-soft text-ink-muted hover:text-ink-primary transition-colors"
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
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-2.5">
            {msg.role === 'assistant' ? (
              <div className="p-1.5 rounded-md bg-surface-base border border-border-soft">
                <meta.icon className={`w-3.5 h-3.5 ${meta.color}`} />
              </div>
            ) : (
              <div className="p-1.5 rounded-md bg-surface-alt border border-border-soft">
                <User className="w-3.5 h-3.5 text-ink-muted" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-ink-muted mb-1">
                {msg.role === 'assistant' ? meta.label : 'You'}
              </p>
              <div className="text-sm text-ink-primary leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {state.isGenerating && (
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-md bg-surface-base border border-border-soft">
              <Loader2 className={`w-3.5 h-3.5 animate-spin ${meta.color}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-muted mb-1">{meta.label}</p>
              <p className="text-sm text-ink-muted">Generating...</p>
            </div>
          </div>
        )}

        {state.error && (
          <div className="p-3 rounded-md bg-accent-error/10 border border-accent-error/20">
            <p className="text-xs text-accent-error">{state.error}</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-border-soft">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about the ${meta.label.toLowerCase()} section...`}
            rows={1}
            className="flex-1 min-w-0 bg-surface-base border border-border-soft rounded-md px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted resize-none outline-none focus:border-ink-muted/40 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || state.isGenerating}
            className="p-2 rounded-md bg-ink-primary text-surface-base hover:opacity-90 transition-opacity disabled:opacity-30 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
