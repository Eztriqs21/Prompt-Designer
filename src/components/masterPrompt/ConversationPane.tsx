import { useRef, useEffect, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import type { Message } from '../../types';
import QuestionBubble from './QuestionBubble';
import UserInputBar from './UserInputBar';

interface ConversationPaneProps {
  messages: Message[];
  onSend: (message: string) => void;
  onGenerate: (idea: string) => void;
  disabled: boolean;
  isGenerating: boolean;
  children?: ReactNode;
}

export default function ConversationPane({
  messages,
  onSend,
  onGenerate,
  disabled,
  isGenerating,
  children,
}: ConversationPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, children]);

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[500px] max-h-[900px]">
      {/* Messages — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 min-h-0" ref={scrollRef}>
        {messages.map((msg) => (
          <QuestionBubble key={msg.id} message={msg} />
        ))}

        {/* Extra content: master prompt output + sections */}
        {children}

        {isGenerating && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
              <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
            </div>
            <div className="liquid-glass rounded-xl rounded-tl-md px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse-subtle" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse-subtle" style={{ animationDelay: '300ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse-subtle" style={{ animationDelay: '600ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input — fixed at bottom */}
      <div className="shrink-0 px-4 sm:px-6 pb-4 pt-3 border-t border-white/[0.06]">
        <UserInputBar
          onSend={onSend}
          onGenerate={onGenerate}
          disabled={disabled}
          isGenerating={isGenerating}
          messageCount={messages.length}
        />
      </div>
    </div>
  );
}
