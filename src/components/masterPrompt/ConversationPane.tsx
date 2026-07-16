import { useRef, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { Message, SectionType, SectionState } from '../../types';
import type { SectionMessage } from '../../lib/apiClient';
import QuestionBubble from './QuestionBubble';
import MasterPromptBubble from './MasterPromptBubble';
import UserInputBar from './UserInputBar';

interface ConversationPaneProps {
  messages: Message[];
  onSend: (message: string) => void;
  onGenerate: (idea: string) => void;
  disabled: boolean;
  isGenerating: boolean;
  error?: string | null;
  sections: Record<SectionType, SectionState>;
  sectionMessages: Record<SectionType, SectionMessage[]>;
  activeSection: SectionType | null;
  onSelectSection: (type: SectionType | null) => void;
  onGenerateSection: (type: SectionType, userRequest?: string) => void;
  chatId: string | null;
  onLoadSectionMessages: (chatId: string, sectionType: SectionType) => Promise<void>;
}

export default function ConversationPane({
  messages,
  onSend,
  onGenerate,
  disabled,
  isGenerating,
  error,
  sections,
  sectionMessages,
  activeSection,
  onSelectSection,
  onGenerateSection,
  chatId,
  onLoadSectionMessages,
}: ConversationPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const threshold = 100;
      isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (scrollRef.current && isNearBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages ÔÇö scrollable */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 min-h-0" ref={scrollRef}>
        {messages.map((msg) =>
          msg.role === 'assistant' && (msg.prompt || msg.summary) ? (
            <MasterPromptBubble
              key={msg.id}
              message={msg}
              sections={sections}
              sectionMessages={sectionMessages}
              activeSection={activeSection}
              onSelectSection={onSelectSection}
              onGenerateSection={onGenerateSection}
              chatId={chatId}
              onLoadSectionMessages={onLoadSectionMessages}
            />
          ) : (
            <QuestionBubble key={msg.id} message={msg} />
          ),
        )}

        {isGenerating && !error && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-md bg-surface-alt border border-border-soft flex items-center justify-center shrink-0 mt-0.5">
              <Loader2 className="w-3.5 h-3.5 text-accent-purple animate-spin" />
            </div>
            <div className="bg-surface-alt border border-border-soft rounded-md rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-purple/40 animate-pulse-subtle" />
                <div className="w-1.5 h-1.5 rounded-full bg-accent-purple/40 animate-pulse-subtle" style={{ animationDelay: '300ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-accent-purple/40 animate-pulse-subtle" style={{ animationDelay: '600ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-md bg-accent-error/10 border border-accent-error/20 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-3.5 h-3.5 text-accent-error" />
            </div>
            <div className="bg-accent-error/10 border border-accent-error/20 rounded-md rounded-tl-sm px-4 py-3 max-w-[85%]">
              <p className="text-sm text-accent-error whitespace-pre-wrap">{error}</p>
              <button
                onClick={() => onGenerate('')}
                className="mt-2 text-xs text-accent-primary hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input ÔÇö fixed at bottom */}
      <div className="shrink-0 px-4 sm:px-6 pb-4 pt-3 border-t border-border-soft">
        <UserInputBar
          onSend={onSend}
          onGenerate={onGenerate}
          disabled={disabled}
          isGenerating={isGenerating}
          error={error}
        />
      </div>
    </div>
  );
}
