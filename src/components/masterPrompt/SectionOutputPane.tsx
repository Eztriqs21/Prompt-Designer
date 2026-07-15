import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Code, Palette, ShieldCheck, Loader2 } from 'lucide-react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { transitionEnter } from '../../motion/presets';
import type { SectionType, SectionState } from '../../types';

interface SectionOutputPaneProps {
  sections: Record<SectionType, SectionState>;
  activeSection: SectionType | null;
}

const SECTION_META: Record<SectionType, { label: string; icon: typeof Code; color: string; emptyMsg: string }> = {
  coding: {
    label: 'Coding',
    icon: Code,
    color: 'text-emerald-400',
    emptyMsg: 'Generate a coding section prompt to get an implementation brief for your coding agent.',
  },
  'ui-ux': {
    label: 'UI/UX',
    icon: Palette,
    color: 'text-violet-400',
    emptyMsg: 'Generate a UI/UX section prompt to get a design specification for your coding agent.',
  },
  audit: {
    label: 'Audit',
    icon: ShieldCheck,
    color: 'text-amber-400',
    emptyMsg: 'Generate an audit section prompt to get a structured review brief for your coding agent.',
  },
};

export default function SectionOutputPane({ sections, activeSection }: SectionOutputPaneProps) {
  const [copied, setCopied] = useState(false);
  const reducedMotion = useReducedMotionSafe();

  const handleCopy = async (text: string) => {
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeSection) {
    return null;
  }

  const state = sections[activeSection];
  const meta = SECTION_META[activeSection];

  return (
    <div className="liquid-glass rounded-2xl flex flex-col" style={{ height: 'min(600px, 70vh)' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <meta.icon className={`w-4 h-4 ${meta.color}`} />
            <h3 className="text-[13px] font-semibold tracking-[0.1em] text-white uppercase">
              {meta.label} Section
            </h3>
          </div>
          {state.data && (
            <motion.button
              whileHover={reducedMotion ? {} : { scale: 1.05 }}
              whileTap={reducedMotion ? {} : { scale: 0.95 }}
              onClick={() => handleCopy(state.data!.masterPrompt)}
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
        <AnimatePresence>
          {state.isGenerating && (
            <motion.div
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5 text-[13px] text-white/40"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating {meta.label.toLowerCase()} section prompt...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!state.isGenerating && state.data?.summary && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? { duration: 0 } : transitionEnter}
              className="mb-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]"
            >
              <p className="text-[11px] font-semibold tracking-wider uppercase text-white/40 mb-1.5">Summary</p>
              <p className="text-[13px] text-white/60 leading-relaxed">{state.data.summary}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!state.isGenerating && state.data?.analysis && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? { duration: 0 } : { ...transitionEnter, delay: 0.08 }}
              className="mb-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]"
            >
              <p className="text-[11px] font-semibold tracking-wider uppercase text-white/40 mb-1.5">Analysis</p>
              <p className="text-[13px] text-white/60 leading-relaxed">{state.data.analysis}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!state.isGenerating && state.data?.masterPrompt && (
            <motion.pre
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? { duration: 0 } : { ...transitionEnter, delay: 0.12 }}
              className="text-[12px] font-mono whitespace-pre-wrap leading-relaxed text-white/80 bg-black/30 border border-white/[0.05] rounded-xl px-4 py-3"
            >
              {state.data.masterPrompt}
            </motion.pre>
          )}
        </AnimatePresence>

        {!state.isGenerating && !state.data && (
          <div className="flex items-center justify-center h-full">
            <p className="text-[14px] text-white/25 text-center leading-relaxed max-w-[260px]">
              {meta.emptyMsg}
            </p>
          </div>
        )}

        <AnimatePresence>
          {state.error && (
            <motion.div
              initial={reducedMotion ? { opacity: 0, y: 8 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 p-4 rounded-xl bg-red-500/[0.06] border border-red-500/10"
            >
              <p className="text-[13px] font-medium text-red-400">Generation Failed</p>
              <p className="text-[12px] text-red-300/50 mt-1">{state.error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
