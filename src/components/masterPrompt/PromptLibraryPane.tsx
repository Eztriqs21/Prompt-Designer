import { useState } from 'react';
import { Pin, Copy, ChevronRight, Loader2, BookOpen, X } from 'lucide-react';
import type { PromptVersion } from '../../types';

interface PromptLibraryPaneProps {
  promptVersions: PromptVersion[];
  isLoading: boolean;
  error: string | null;
  onPin: (promptId: string) => void;
  onClone: (promptId: string) => void;
  onViewPrompt: (prompt: PromptVersion) => void;
  onClose?: () => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PromptLibraryPane({
  promptVersions,
  isLoading,
  error,
  onPin,
  onClone,
  onViewPrompt,
  onClose,
}: PromptLibraryPaneProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="flex items-center gap-2.5 text-sm text-ink-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading prompt versions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <p className="text-sm text-accent-error">{error}</p>
      </div>
    );
  }

  if (promptVersions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <BookOpen className="w-8 h-8 text-ink-muted/30 mb-3" />
        <p className="text-sm text-ink-muted text-center leading-relaxed max-w-[240px]">
          No prompt versions yet. Generate a master prompt to start building your library.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border-soft shrink-0 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-wider uppercase text-ink-primary">
            Prompt Library
          </h3>
          <p className="mt-1 text-xs text-ink-muted">
            {promptVersions.length} version{promptVersions.length !== 1 ? 's' : ''} for this chat.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-surface-alt transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
        {promptVersions.map((prompt) => (
          <div key={prompt.id} className="mb-3">
            <div className="rounded-md bg-surface-alt border border-border-soft overflow-hidden">
              {/* Version row */}
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="shrink-0 px-2 py-0.5 text-xs font-semibold rounded-md bg-surface-base border border-border-soft text-ink-muted">
                  v{prompt.version}
                </span>

                {prompt.isPinned && (
                  <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md bg-surface-base border border-border-soft text-ink-primary">
                    <Pin className="w-2.5 h-2.5" />
                    Current
                  </span>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink-primary truncate">{prompt.title}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{formatDate(prompt.createdAt)}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setExpandedId(expandedId === prompt.id ? null : prompt.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-surface-base border border-border-soft text-ink-muted hover:text-ink-primary transition-colors"
                  >
                    <ChevronRight className={`w-3 h-3 transition-transform ${expandedId === prompt.id ? 'rotate-90' : ''}`} />
                    View
                  </button>
                  {!prompt.isPinned && (
                    <button
                      onClick={() => onPin(prompt.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-surface-base border border-border-soft text-ink-muted hover:text-ink-primary transition-colors"
                    >
                      <Pin className="w-3 h-3" />
                      Pin
                    </button>
                  )}
                  <button
                    onClick={() => onClone(prompt.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-surface-base border border-border-soft text-ink-muted hover:text-ink-primary transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Clone
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === prompt.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-border-soft">
                  {prompt.summary && (
                    <div className="pt-3">
                      <p className="text-xs font-semibold tracking-wider uppercase text-ink-muted mb-1">Summary</p>
                      <p className="text-xs text-ink-primary leading-relaxed">{prompt.summary}</p>
                    </div>
                  )}

                  {prompt.analysis && (
                    <div>
                      <p className="text-xs font-semibold tracking-wider uppercase text-ink-muted mb-1">Analysis</p>
                      <p className="text-xs text-ink-primary leading-relaxed">{prompt.analysis}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold tracking-wider uppercase text-ink-muted mb-1">Master Prompt</p>
                    <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-ink-primary bg-surface-base border border-border-soft rounded-md px-3 py-2 max-h-60 overflow-y-auto">
                      {prompt.masterPrompt}
                    </pre>
                  </div>

                  <button
                    onClick={() => onViewPrompt(prompt)}
                    className="text-xs text-ink-muted hover:text-ink-primary transition-colors"
                  >
                    Open full view →
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
