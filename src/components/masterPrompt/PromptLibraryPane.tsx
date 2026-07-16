import { useState, useRef } from 'react';
import { Pin, ChevronRight, Loader2, BookOpen, X } from 'lucide-react';
import type { PromptVersion } from '../../types';
import Chip from '../ui/Chip';
import Button from '../ui/Button';
import FormattedPrompt from './FormattedPrompt';

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

function snippetOf(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 120 ? `${t.slice(0, 120)}…` : t;
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimer = useRef<number | null>(null);

  const handleCopyForAgent = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopiedId(null), 1800);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="flex items-center gap-2.5 text-body text-secondary-midGray">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading prompt versions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <p className="text-body text-semantic-dangerRed">{error}</p>
      </div>
    );
  }

  if (promptVersions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <BookOpen className="w-8 h-8 text-secondary-midGray/30 mb-3" />
        <p className="text-body text-secondary-midGray text-center leading-relaxed max-w-[240px]">
          No prompt versions yet. Generate a master prompt to start building your library.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-secondary-borderGray shrink-0 flex items-center justify-between">
        <div>
          <h3 className="text-body font-semibold tracking-wider uppercase text-primary-light">
            Prompt Library
          </h3>
          <p className="mt-1 text-small text-secondary-midGray">
            {promptVersions.length} version{promptVersions.length !== 1 ? 's' : ''} for this chat.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-secondary-midGray hover:text-primary-light hover:bg-secondary-darkSurface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
        {promptVersions.map((prompt) => (
          <div key={prompt.id} className="mb-3">
            <div className="rounded-md bg-secondary-darkSurface border border-secondary-borderGray overflow-hidden">
              {/* Version card */}
              <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Chip variant={prompt.isPinned ? 'accent' : 'default'}>v{prompt.version}</Chip>
                      {prompt.isPinned && <Chip variant="accent">Current</Chip>}
                    </div>
                    <p className="text-body text-primary-light truncate">{prompt.title}</p>
                    <p className="text-small text-secondary-midGray mt-0.5">{formatDate(prompt.createdAt)}</p>
                    {prompt.masterPrompt && (
                      <p className="text-small font-mono text-secondary-midGray mt-2 line-clamp-2 leading-relaxed">
                        {snippetOf(prompt.masterPrompt)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopyForAgent(prompt.id, prompt.masterPrompt)}
                      >
                        Copy for coding agent
                      </Button>
                      <button
                        onClick={() => setExpandedId(expandedId === prompt.id ? null : prompt.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-small font-medium rounded-md bg-primary-dark border border-secondary-borderGray text-secondary-midGray hover:text-primary-light transition-colors"
                      >
                        <ChevronRight className={`w-3 h-3 transition-transform ${expandedId === prompt.id ? 'rotate-90' : ''}`} />
                        View
                      </button>
                      {!prompt.isPinned && (
                        <button
                          onClick={() => onPin(prompt.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-small font-medium rounded-md bg-primary-dark border border-secondary-borderGray text-secondary-midGray hover:text-primary-light transition-colors"
                        >
                          <Pin className="w-3 h-3" />
                          Pin
                        </button>
                      )}
                      <button
                        onClick={() => onClone(prompt.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-small font-medium rounded-md bg-primary-dark border border-secondary-borderGray text-secondary-midGray hover:text-primary-light transition-colors"
                      >
                        Clone
                      </button>
                    </div>
                    {copiedId === prompt.id && (
                      <span className="text-small text-success-green">Copied</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === prompt.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-secondary-borderGray">
                  {prompt.summary && (
                    <div className="pt-3">
                      <p className="text-small font-semibold tracking-wider uppercase text-secondary-midGray mb-1">Summary</p>
                      <p className="text-small text-primary-light leading-relaxed">{prompt.summary}</p>
                    </div>
                  )}

                  {prompt.analysis && (
                    <div>
                      <p className="text-small font-semibold tracking-wider uppercase text-secondary-midGray mb-1">Analysis</p>
                      <p className="text-small text-primary-light leading-relaxed">{prompt.analysis}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-small font-semibold tracking-wider uppercase text-secondary-midGray mb-1.5">Master Prompt</p>
                    <FormattedPrompt content={prompt.masterPrompt} />
                  </div>

                  <button
                    onClick={() => onViewPrompt(prompt)}
                    className="text-small text-secondary-midGray hover:text-primary-light transition-colors"
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
