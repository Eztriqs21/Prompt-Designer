import { useRef, useEffect } from 'react';
import { Bot, AlertTriangle } from 'lucide-react';
import type { Message } from '../../types';
import QuestionBubble from './QuestionBubble';
import MasterPromptBubble from './MasterPromptBubble';
import UserInputBar from './UserInputBar';
import GenerationLoader from './GenerationLoader';
import FadeIn from '../ui/FadeIn';

interface ConversationPaneProps {
  messages: Message[];
  onGenerate: (idea: string) => void;
  disabled: boolean;
  isGenerating: boolean;
  error?: string | null;
  hasPrompt: boolean;
}

export default function ConversationPane({
  messages,
  onGenerate,
  disabled,
  isGenerating,
  error,
  hasPrompt,
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
      {/* Messages — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 min-h-0" ref={scrollRef}>
        {messages.map((msg) =>
          msg.role === 'assistant' && (msg.prompt || msg.summary) ? (
            <MasterPromptBubble key={msg.id} message={msg} />
          ) : (
            <QuestionBubble key={msg.id} message={msg} />
          ),
        )}

        {isGenerating && !error && (
          <FadeIn className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-md bg-secondary-darkSurface border border-secondary-borderGray flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 text-secondary-midGray" />
            </div>
            <div className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md rounded-tl-sm px-4 py-3">
              <GenerationLoader />
            </div>
          </FadeIn>
        )}

        {error && (
          <FadeIn className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-md bg-semantic-dangerRed/10 border border-semantic-dangerRed/20 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-3.5 h-3.5 text-semantic-dangerRed" />
            </div>
            <div className="bg-semantic-dangerRed/10 border border-semantic-dangerRed/20 rounded-md rounded-tl-sm px-4 py-3 max-w-[85%]">
              <p className="text-body text-semantic-dangerRed whitespace-pre-wrap">{error}</p>
              <button
                onClick={() => onGenerate('')}
                className="mt-2 text-small text-accent-orange hover:underline"
              >
                Retry
              </button>
            </div>
          </FadeIn>
        )}
      </div>

      {/* Input — fixed at bottom; only for initial idea capture.
          After the master prompt exists, continuation is handled by WorkflowPanel. */}
      <div className="shrink-0 px-4 sm:px-6 pb-4 pt-3 border-t border-secondary-borderGray">
        {!hasPrompt && (
          <UserInputBar
            onGenerate={onGenerate}
            disabled={disabled}
            isGenerating={isGenerating}
            error={error}
          />
        )}
      </div>
    </div>
  );
}
