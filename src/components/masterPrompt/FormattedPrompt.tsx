import { useMemo, Component, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { transitionEnter } from '../../motion/presets';
import { formatPromptContent } from '../../lib/formatPrompt';

interface FormattedPromptProps {
  content: string;
  delay?: number;
}

class PromptErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default function FormattedPrompt({ content, delay = 0 }: FormattedPromptProps) {
  const reducedMotion = useReducedMotionSafe();
  const html = useMemo(() => formatPromptContent(content), [content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { ...transitionEnter, delay }}
      className="rounded-xl bg-black/20 border border-white/[0.05] px-5 py-4 overflow-hidden"
    >
      <PromptErrorBoundary
        fallback={
          <pre className="text-[12px] font-mono whitespace-pre-wrap leading-relaxed text-white/70">
            {content}
          </pre>
        }
      >
        <div
          className="prose-invert max-w-none [&_h3]:border-b [&_h3]:border-white/[0.06] [&_h3]:pb-2"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </PromptErrorBoundary>
    </motion.div>
  );
}
