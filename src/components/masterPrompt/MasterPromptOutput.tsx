import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Bot } from 'lucide-react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { fadeInUp, slideFromLeft, transitionFast, transitionEnter } from '../../motion/presets';
import FormattedPrompt from './FormattedPrompt';
import SectionSelector from './SectionSelector';
import SectionOutputPane from './SectionOutputPane';
import type { SectionType, SectionState } from '../../types';

interface MasterPromptOutputProps {
  summary: string | null;
  analysis: string | null;
  masterPrompt: string | null;
  sections: Record<SectionType, SectionState>;
  activeSection: SectionType | null;
  onSelectSection: (type: SectionType | null) => void;
  onGenerateSection: (type: SectionType, userRequest?: string) => void;
}

export default function MasterPromptOutput({
  summary,
  analysis,
  masterPrompt,
  sections,
  activeSection,
  onSelectSection,
  onGenerateSection,
}: MasterPromptOutputProps) {
  const [copied, setCopied] = useState(false);
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

  if (!masterPrompt) return null;

  return (
    <motion.div
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      variants={slideFromLeft}
      transition={reducedMotion ? { duration: 0 } : transitionFast}
      className="flex items-start gap-3"
    >
      {/* Bot avatar */}
      <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-4 h-4 text-white/50" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Summary card */}
        {summary && (
          <motion.div
            initial={reducedMotion ? false : fadeInUp.hidden}
            animate={fadeInUp.visible}
            transition={reducedMotion ? { duration: 0 } : transitionEnter}
            className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]"
          >
            <p className="text-[11px] font-semibold tracking-wider uppercase text-white/35 mb-1.5">Summary</p>
            <p className="text-[13px] text-white/60 leading-relaxed">{summary}</p>
          </motion.div>
        )}

        {/* Analysis card */}
        {analysis && (
          <motion.div
            initial={reducedMotion ? false : fadeInUp.hidden}
            animate={fadeInUp.visible}
            transition={reducedMotion ? { duration: 0 } : { ...transitionEnter, delay: 0.06 }}
            className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]"
          >
            <p className="text-[11px] font-semibold tracking-wider uppercase text-white/35 mb-1.5">Analysis</p>
            <p className="text-[13px] text-white/60 leading-relaxed">{analysis}</p>
          </motion.div>
        )}

        {/* Formatted master prompt */}
        <FormattedPrompt content={masterPrompt} delay={0.1} />

        {/* Copy button */}
        <motion.div
          initial={reducedMotion ? false : fadeInUp.hidden}
          animate={fadeInUp.visible}
          transition={reducedMotion ? { duration: 0 } : { ...transitionEnter, delay: 0.15 }}
          className="flex justify-end"
        >
          <motion.button
            whileHover={reducedMotion ? {} : { scale: 1.03 }}
            whileTap={reducedMotion ? {} : { scale: 0.97 }}
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full bg-white/[0.06] text-white/45 hover:text-white hover:bg-white/[0.1] transition-colors"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3" />
                  Copied
                </motion.span>
              ) : (
                <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-1.5">
                  <Copy className="w-3 h-3" />
                  Copy Prompt
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>

        {/* Section buttons + output */}
        <motion.div
          initial={reducedMotion ? false : fadeInUp.hidden}
          animate={fadeInUp.visible}
          transition={reducedMotion ? { duration: 0 } : { ...transitionEnter, delay: 0.18 }}
          className="space-y-3"
        >
          <SectionSelector
            sections={sections}
            activeSection={activeSection}
            onSelect={onSelectSection}
            onGenerate={onGenerateSection}
          />
          <SectionOutputPane
            sections={sections}
            activeSection={activeSection}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
