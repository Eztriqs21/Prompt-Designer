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

/* Matches short title-case section headers ending in a colon, e.g. "Context:", "Edge cases:". */
const HEADER_RE = /^([A-Z][A-Za-z0-9 /&'-]+):\s*$/;

interface Segment {
  label: string;
  body: string[];
}

function parseSegments(raw: string): Segment[] {
  const text = raw.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) return [];
  const segments: Segment[] = [];
  let current: Segment | null = null;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    const match = trimmed.match(HEADER_RE);
    if (match) {
      current = { label: match[1], body: [] };
      segments.push(current);
      continue;
    }
    if (!current) {
      current = { label: '', body: [] };
      segments.push(current);
    }
    current.body.push(trimmed);
  }
  return segments.filter((s) => s.label !== '' || s.body.some((b) => b.trim() !== ''));
}

export default function FormattedPrompt({ content }: FormattedPromptProps) {
  const segments = useMemo(() => parseSegments(content), [content]);

  const renderBody = (raw: string) => (
    <div
      className="text-body text-primary-light leading-relaxed"
      dangerouslySetInnerHTML={{ __html: formatPromptContent(raw) }}
    />
  );

  if (segments.length === 0) {
    return (
      <div className="rounded-md bg-secondary-darkSurface border border-secondary-borderGray px-5 py-4 overflow-hidden">
        {renderBody(content)}
      </div>
    );
  }

  return (
    <div className="rounded-md bg-secondary-darkSurface border border-secondary-borderGray px-5 py-4 space-y-4 overflow-hidden">
      <PromptErrorBoundary fallback={renderBody(content)}>
        {segments.map((seg, i) => (
          <div key={i} className="space-y-2">
            {seg.label && (
              <>
                <p className="text-small text-accent-purple">{seg.label}</p>
                <hr className="border-t border-secondary-borderGray" />
              </>
            )}
            {renderBody(seg.body.join('\n'))}
          </div>
        ))}
      </PromptErrorBoundary>
    </div>
  );
}
