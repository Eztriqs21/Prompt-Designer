import { memo } from 'react';
import { Bot, User } from 'lucide-react';
import type { Message } from '../../types';

interface QuestionBubbleProps {
  message: Message;
}

function formatTimestamp(ts?: number): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default memo(function QuestionBubble({ message }: QuestionBubbleProps) {
  const isUser = message.role === 'user';
  const label = isUser ? 'User' : 'Assistant';
  const timestamp = formatTimestamp(message.timestamp);

  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-md bg-secondary-darkSurface border border-secondary-borderGray flex items-center justify-center shrink-0 mt-0.5">
        {isUser ? (
          <User className="w-3.5 h-3.5 text-accent-blue" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-secondary-midGray" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-small text-secondary-midGray">{label}</span>
          {timestamp && <span className="text-small text-secondary-midGray">{timestamp}</span>}
        </div>
        <div className="rounded-md bg-secondary-darkSurface border border-secondary-borderGray px-4 py-3">
          <div
            className={`whitespace-pre-wrap text-body leading-relaxed ${
              isUser ? 'text-primary-light' : 'text-secondary-midGray'
            }`}
          >
            {message.content}
          </div>
        </div>
      </div>
    </div>
  );
});
