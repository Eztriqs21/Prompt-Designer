import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertTriangle, RotateCcw } from 'lucide-react';
import { PROMPT_TEMPLATES } from '../../lib/promptTemplates';

interface UserInputBarProps {
  onSend: (message: string) => void;
  onGenerate: (idea: string) => void;
  disabled: boolean;
  isGenerating: boolean;
  error?: string | null;
}

export default function UserInputBar({
  onSend,
  onGenerate,
  disabled,
  isGenerating,
  error,
}: UserInputBarProps) {
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

  const handleRetry = () => {
    if (input.trim()) {
      onGenerate(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertTemplate = (scaffold: string) => {
    setInput((prev) => (prev.trim() ? `${prev}\n\n${scaffold}` : scaffold));
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const hasInput = input.trim().length > 0;
  const showError = error && !isGenerating;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 flex-wrap px-4 pt-2.5">
        <span className="text-small text-secondary-midGray uppercase tracking-wider">Templates</span>
        {PROMPT_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            title={template.description}
            onClick={() => insertTemplate(template.scaffold)}
            className="text-small px-2.5 py-1 rounded-md bg-primary-dark border border-secondary-borderGray text-secondary-midGray hover:text-accent-orange hover:border-accent-orange/30 transition-colors"
          >
            {template.title}
          </button>
        ))}
      </div>

      <div className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md px-4 py-2.5 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your website idea..."
          disabled={disabled || isGenerating}
          rows={1}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-body text-primary-light placeholder:text-secondary-midGray resize-none disabled:opacity-40 leading-relaxed pt-0.5"
        />
        <div className="flex items-center gap-2 shrink-0 pb-0.5">
          <button
            onClick={handleGenerate}
            disabled={!hasInput || disabled || isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-small font-medium rounded-md bg-primary-dark border border-secondary-borderGray text-secondary-midGray hover:text-accent-orange hover:border-accent-orange/30 transition-colors disabled:opacity-30"
          >
            <Sparkles className="w-3 h-3" />
            Generate
          </button>
          <button
            onClick={handleSend}
            disabled={!hasInput || disabled || isGenerating}
            className="p-2 rounded-md bg-primary-light text-primary-dark hover:bg-primary-light/90 transition-colors disabled:opacity-30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      {showError && (
        <div className="mt-2 flex items-center justify-center gap-2 text-small text-semantic-dangerRed">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1 text-center">{error}</span>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1 px-2 py-1 text-accent-orange hover:underline disabled:opacity-50"
            disabled={!hasInput || disabled}
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}
      {!showError && !isGenerating && (
        <p className="mt-1.5 text-small text-secondary-midGray text-center">
          Describe your idea, then click Generate when ready.
        </p>
      )}
      {isGenerating && !error && (
        <p className="mt-1.5 text-small text-secondary-midGray text-center">Generating...</p>
      )}
    </div>
  );
}