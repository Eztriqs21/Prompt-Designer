import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Check, ChevronRight, Loader2 } from 'lucide-react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import {
  fadeInUp,
  expandCollapse,
  hoverScaleSmall,
  transitionFast,
  transitionEnter,
} from '../../motion/presets';
import examplePrompt from '../../assets/example-prompt.txt?raw';

interface PromptOutputPaneProps {
  masterPrompt: string | null;
  summary: string | null;
  analysis: string | null;
  isGenerating: boolean;
  error: string | null;
  onClearError: () => void;
  onGenerate: () => void;
}

export default function PromptOutputPane({
  masterPrompt,
  summary,
  analysis,
  isGenerating,
  error,
  onClearError,
  onGenerate,
}: PromptOutputPaneProps) {
  const [copied, setCopied] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const reducedMotion = useReducedMotionSafe();

  const handleCopy = async () => {
    if (!masterPrompt) return;
    try {
      await navigator.clipboard.writeText(masterPrompt);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = masterPrompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="liquid-glass rounded-2xl flex flex-col" style={{ height: 'min(720px, 80vh)' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[13px] font-semibold tracking-[0.1em] text-white uppercase">
            Master Prompt Output
          </h3>
          <motion.button
            whileHover={reducedMotion ? {} : { scale: 1.03 }}
            whileTap={reducedMotion ? {} : { scale: 0.97 }}
            onClick={onGenerate}
            disabled={isGenerating || !masterPrompt}
            className="shrink-0 px-3.5 py-1.5 text-[11px] font-medium rounded-full bg-white/[0.06] text-white/55 hover:text-white hover:bg-white/[0.1] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Regenerate'}
          </motion.button>
        </div>
        <p className="mt-1 text-[12px] text-white/40">
          Copy this prompt into your coding agent to implement the website.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5 text-[13px] text-white/40"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating master prompt...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isGenerating && summary && (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? { duration: 0 } : transitionEnter}
              className="mb-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]"
            >
              <p className="text-[11px] font-semibold tracking-wider uppercase text-white/40 mb-1.5">Summary</p>
              <p className="text-[13px] text-white/60 leading-relaxed">{summary}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isGenerating && analysis && (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? { duration: 0 } : { ...transitionEnter, delay: 0.08 }}
              className="mb-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]"
            >
              <p className="text-[11px] font-semibold tracking-wider uppercase text-white/40 mb-1.5">Analysis</p>
              <p className="text-[13px] text-white/60 leading-relaxed">{analysis}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isGenerating && masterPrompt && (
            <motion.pre
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? { duration: 0 } : { ...transitionEnter, delay: 0.12 }}
              className="text-[12px] font-mono whitespace-pre-wrap leading-relaxed text-white/80 bg-black/30 border border-white/[0.05] rounded-xl px-4 py-3"
            >
              {masterPrompt}
            </motion.pre>
          )}
        </AnimatePresence>

        {!isGenerating && !masterPrompt && (
          <div className="flex items-center justify-center h-full">
            <p className="text-[14px] text-white/25 text-center leading-relaxed max-w-[220px]">
              No master prompt yet. Explain your idea on the left, then generate.
            </p>
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 p-4 rounded-xl bg-red-500/[0.06] border border-red-500/10"
            >
              <p className="text-[13px] font-medium text-red-400">Generation Failed</p>
              <p className="text-[12px] text-red-300/50 mt-1">{error}</p>
              <button
                onClick={onClearError}
                className="mt-2 text-[11px] text-red-400/70 hover:text-red-400 transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="px-5 pb-4 pt-3 border-t border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between gap-3">
          <motion.button
            whileHover={reducedMotion ? {} : { scale: 1.02 }}
            whileTap={reducedMotion ? {} : { scale: 0.98 }}
            className="flex items-center gap-1.5 text-[11px] text-white/35 hover:text-white/60 transition-colors"
            onClick={() => setShowExample((v) => !v)}
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${showExample ? 'rotate-90' : ''}`} />
            {showExample ? 'Hide Examples' : 'View Examples'}
          </motion.button>

          {masterPrompt && (
            <motion.button
              whileHover={reducedMotion ? {} : { scale: 1.05 }}
              whileTap={reducedMotion ? {} : { scale: 0.95 }}
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3" />
                    Copied
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-1.5"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}
        </div>

        <AnimatePresence>
          {showExample && (
            <motion.div
              initial={reducedMotion ? false : 'collapsed'}
              animate="expanded"
              exit={reducedMotion ? { opacity: 0 } : 'collapsed'}
              variants={expandCollapse}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-xl bg-black/30 border border-white/[0.05] overflow-hidden">
                <div className="px-3 py-2 border-b border-white/[0.05] flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-white/30">
                    5 Reference Prompts
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(examplePrompt).catch(() => {})}
                    className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
                  >
                    Copy All
                  </button>
                </div>
                <div className="p-3 max-h-44 overflow-y-auto">
                  <pre className="font-mono text-[10px] text-white/30 whitespace-pre-wrap leading-relaxed">
                    {examplePrompt}
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
