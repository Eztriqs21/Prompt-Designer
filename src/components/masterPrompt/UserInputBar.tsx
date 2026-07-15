import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';

interface UserInputBarProps {
  onSend: (message: string) => void;
  onGenerate: (idea: string) => void;
  disabled: boolean;
  isGenerating: boolean;
}

export default function UserInputBar({ onSend, onGenerate, disabled, isGenerating }: UserInputBarProps) {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reducedMotion = useReducedMotionSafe();

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
      <motion.div
        animate={reducedMotion ? {} : { boxShadow: focused ? '0 0 0 2px rgba(129, 140, 248, 0.25)' : '0 0 0 0px rgba(129, 140, 248, 0)' }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
        className={`liquid-glass rounded-xl px-4 py-2.5 flex items-end gap-2 transition-shadow duration-200 ${
          focused ? 'ring-2 ring-indigo-500/40' : ''
        }`}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Describe your website idea..."
          disabled={disabled}
          rows={1}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-[14px] text-white placeholder:text-white/25 resize-none disabled:opacity-40 leading-relaxed pt-0.5"
        />
        <div className="flex items-center gap-2 shrink-0 pb-0.5">
          <motion.button
            whileHover={reducedMotion ? {} : { scale: 1.05 }}
            whileTap={reducedMotion ? {} : { scale: 0.95 }}
            onClick={handleGenerate}
            disabled={!hasInput || disabled || isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors disabled:opacity-30"
          >
            <Sparkles className="w-3 h-3" />
            Generate
          </motion.button>
          <motion.button
            whileHover={reducedMotion ? {} : { scale: 1.08 }}
            whileTap={reducedMotion ? {} : { scale: 0.92 }}
            onClick={handleSend}
            disabled={!hasInput || disabled}
            className="p-2 rounded-lg bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-30"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
      <p className="mt-1.5 text-[10px] text-white/20 text-center">
        {isGenerating
          ? 'Generating...'
          : 'Describe your idea, then click Generate when ready.'}
      </p>
    </div>
  );
}
