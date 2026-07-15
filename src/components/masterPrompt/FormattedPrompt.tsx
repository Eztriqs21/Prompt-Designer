import { useMemo, Component, type ReactNode } from 'react';
import { formatPromptContent } from '../../lib/formatPrompt';

interface FormattedPromptProps {
  content: string;
}

class PromptErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default function FormattedPrompt({ content }: FormattedPromptProps) {
  const html = useMemo(() => formatPromptContent(content), [content]);

  return (
    <div className="rounded-md bg-surface-alt border border-border-soft px-5 py-4 overflow-hidden">
      <PromptErrorBoundary
        fallback={
          <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-ink-primary">
            {content}
          </pre>
        }
      >
        <div
          className="prose-invert max-w-none [&_h3]:border-b [&_h3]:border-border-soft [&_h3]:pb-2"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </PromptErrorBoundary>
    </div>
  );
}
