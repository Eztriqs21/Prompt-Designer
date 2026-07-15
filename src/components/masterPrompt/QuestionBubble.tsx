import { memo } from 'react';
import { Bot, User } from 'lucide-react';
import type { Message } from '../../types';

interface QuestionBubbleProps {
  message: Message;
}

export default memo(function QuestionBubble({ message }: QuestionBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className="w-7 h-7 rounded-md bg-surface-alt border border-border-soft flex items-center justify-center shrink-0 mt-0.5">
        {isUser ? (
          <User className="w-3.5 h-3.5 text-ink-muted" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-ink-muted" />
        )}
      </div>

      <div
        className={`max-w-[85%] rounded-md px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-ink-primary text-surface-base rounded-tr-sm'
            : 'bg-surface-alt text-ink-primary border border-border-soft rounded-tl-sm'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
});
