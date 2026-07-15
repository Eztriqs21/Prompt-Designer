import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pin, Copy, ChevronRight, Loader2, BookOpen } from 'lucide-react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import {
  fadeInUp,
  staggerContainer,
  expandCollapse,
  transitionFast,
} from '../../motion/presets';
import type { PromptVersion } from '../../types';

interface PromptLibraryPaneProps {
  promptVersions: PromptVersion[];
  isLoading: boolean;
  error: string | null;
  onPin: (promptId: string) => void;
  onClone: (promptId: string) => void;
  onViewPrompt: (prompt: PromptVersion) => void;
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
}: PromptLibraryPaneProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const reducedMotion = useReducedMotionSafe();

  if (isLoading) {
    return (
      <div className="liquid-glass rounded-2xl p-8 flex items-center justify-center" style={{ height: 'min(720px, 80vh)' }}>
        <div className="flex items-center gap-2.5 text-[13px] text-white/40">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading prompt versions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="liquid-glass rounded-2xl p-8 flex items-center justify-center" style={{ height: 'min(720px, 80vh)' }}>
        <p className="text-[13px] text-red-400">{error}</p>
      </div>
    );
  }

  if (promptVersions.length === 0) {
    return (
      <div className="liquid-glass rounded-2xl flex flex-col items-center justify-center" style={{ height: 'min(720px, 80vh)' }}>
        <BookOpen className="w-8 h-8 text-white/15 mb-3" />
        <p className="text-[14px] text-white/25 text-center leading-relaxed max-w-[240px]">
          No prompt versions yet. Generate a master prompt to start building your library.
        </p>
      </div>
    );
  }

  return (
    <div className="liquid-glass rounded-2xl flex flex-col" style={{ height: 'min(720px, 80vh)' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] shrink-0">
        <h3 className="text-[13px] font-semibold tracking-[0.1em] text-white uppercase">
          Prompt Library
        </h3>
        <p className="mt-1 text-[12px] text-white/40">
          {promptVersions.length} version{promptVersions.length !== 1 ? 's' : ''} for this chat.
        </p>
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
        <motion.div
          variants={staggerContainer}
          {...(reducedMotion ? {} : { initial: 'hidden', animate: 'visible' })}
        >
          {promptVersions.map((prompt) => (
            <motion.div
              key={prompt.id}
              variants={fadeInUp}
              transition={reducedMotion ? { duration: 0 } : transitionFast}
              className="mb-3"
            >
              <div
                className="rounded-xl bg-white/[0.03] border border-white/[0.05] overflow-hidden transition-colors hover:bg-white/[0.05]"
              >
                {/* Version row */}
                <div className="px-4 py-3 flex items-center gap-3">
                  {/* Version badge */}
                  <span className="shrink-0 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-white/[0.06] text-white/50">
                    v{prompt.version}
                  </span>

                  {/* Pinned badge */}
                  {prompt.isPinned && (
                    <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-white/[0.08] text-white/60">
                      <Pin className="w-2.5 h-2.5" />
                      Current
                    </span>
                  )}

                  {/* Title + date */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-white/70 truncate">{prompt.title}</p>
                    <p className="text-[11px] text-white/30 mt-0.5">{formatDate(prompt.createdAt)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <motion.button
                      whileHover={reducedMotion ? {} : { scale: 1.05 }}
                      whileTap={reducedMotion ? {} : { scale: 0.95 }}
                      onClick={() => setExpandedId(expandedId === prompt.id ? null : prompt.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                    >
                      <ChevronRight className={`w-3 h-3 transition-transform ${expandedId === prompt.id ? 'rotate-90' : ''}`} />
                      View
                    </motion.button>
                    {!prompt.isPinned && (
                      <motion.button
                        whileHover={reducedMotion ? {} : { scale: 1.05 }}
                        whileTap={reducedMotion ? {} : { scale: 0.95 }}
                        onClick={() => onPin(prompt.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                      >
                        <Pin className="w-3 h-3" />
                        Pin
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={reducedMotion ? {} : { scale: 1.05 }}
                      whileTap={reducedMotion ? {} : { scale: 0.95 }}
                      onClick={() => onClone(prompt.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Clone
                    </motion.button>
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expandedId === prompt.id && (
                    <motion.div
                      initial={reducedMotion ? false : 'collapsed'}
                      animate="expanded"
                      exit={reducedMotion ? { opacity: 0 } : 'collapsed'}
                      variants={expandCollapse}
                      transition={reducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04]">
                        {/* Summary */}
                        {prompt.summary && (
                          <div className="pt-3">
                            <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1">Summary</p>
                            <p className="text-[12px] text-white/50 leading-relaxed">{prompt.summary}</p>
                          </div>
                        )}

                        {/* Analysis */}
                        {prompt.analysis && (
                          <div>
                            <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1">Analysis</p>
                            <p className="text-[12px] text-white/50 leading-relaxed">{prompt.analysis}</p>
                          </div>
                        )}

                        {/* Full prompt */}
                        <div>
                          <p className="text-[10px] font-semibold tracking-wider uppercase text-white/30 mb-1">Master Prompt</p>
                          <pre className="text-[11px] font-mono whitespace-pre-wrap leading-relaxed text-white/60 bg-black/20 border border-white/[0.04] rounded-lg px-3 py-2 max-h-60 overflow-y-auto">
                            {prompt.masterPrompt}
                          </pre>
                        </div>

                        {/* View full button */}
                        <button
                          onClick={() => onViewPrompt(prompt)}
                          className="text-[11px] text-white/35 hover:text-white/60 transition-colors"
                        >
                          Open full view →
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
