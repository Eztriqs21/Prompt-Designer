import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface UserInputBarProps {
  onSend: (message: string) => void;
  onGenerate: (idea: string) => void;
  disabled: boolean;
  isGenerating: boolean;
}

export default function UserInputBar({ onSend, onGenerate, disabled, isGenerating }: UserInputBarProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 72)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleGenerate = () => {
    if (!input.trim() || disabled) return;
    onGenerate(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasInput = input.trim().length > 0;

  return (
    <div className="w-full">
      <div className="bg-surface-alt border border-border-soft rounded-md px-4 py-2.5 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your website idea..."
          disabled={disabled}
          rows={1}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-ink-primary placeholder:text-ink-muted resize-none disabled:opacity-40 leading-relaxed pt-0.5"
        />
        <div className="flex items-center gap-2 shrink-0 pb-0.5">
          <button
            onClick={handleGenerate}
            disabled={!hasInput || disabled || isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-surface-base border border-border-soft text-ink-muted hover:text-accent-purple hover:border-accent-purple/30 transition-colors disabled:opacity-30"
          >
            <Sparkles className="w-3 h-3" />
            Generate
          </button>
          <button
            onClick={handleSend}
            disabled={!hasInput || disabled}
            className="p-2 rounded-md bg-accent-primary text-surface-base hover:bg-accent-primary/90 transition-colors disabled:opacity-30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-ink-muted text-center">
        {isGenerating
          ? 'Generating...'
          : 'Describe your idea, then click Generate when ready.'}
      </p>
    </div>
  );
}
