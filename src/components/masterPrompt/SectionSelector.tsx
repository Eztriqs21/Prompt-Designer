import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Palette, ShieldCheck, Loader2, ChevronDown } from 'lucide-react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { hoverScaleSmall, transitionFast } from '../../motion/presets';
import type { SectionType, SectionState } from '../../types';

interface SectionSelectorProps {
  sections: Record<SectionType, SectionState>;
  activeSection: SectionType | null;
  onSelect: (type: SectionType) => void;
  onGenerate: (type: SectionType, userRequest?: string) => void;
}

const SECTION_CONFIG: Record<SectionType, { label: string; icon: typeof Code; color: string }> = {
  coding: { label: 'Coding', icon: Code, color: 'text-emerald-400' },
  'ui-ux': { label: 'UI/UX', icon: Palette, color: 'text-violet-400' },
  audit: { label: 'Audit', icon: ShieldCheck, color: 'text-amber-400' },
};

export default function SectionSelector({
  sections,
  activeSection,
  onSelect,
  onGenerate,
}: SectionSelectorProps) {
  const reducedMotion = useReducedMotionSafe();
  const [requestInput, setOpenFor] = useState<SectionType | null>(null);
  const [requestText, setRequestText] = useState('');

  const handleGenerate = (type: SectionType) => {
    const text = requestInput === type ? requestText.trim() : undefined;
    onGenerate(type, text || undefined);
    setRequestText('');
    setOpenFor(null);
    onSelect(type);
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold tracking-wider uppercase text-white/30">
        Section Prompts
      </p>

      <div className="flex flex-wrap gap-2">
        {(['coding', 'ui-ux', 'audit'] as SectionType[]).map((type) => {
          const config = SECTION_CONFIG[type];
          const state = sections[type];
          const Icon = config.icon;
          const isActive = activeSection === type;
          const hasData = !!state.data;
          const isGenerating = state.isGenerating;

          return (
            <div key={type} className="relative">
              <motion.button
                {...(reducedMotion ? {} : hoverScaleSmall)}
                onClick={() => {
                  if (isActive && hasData) {
                    onSelect(type);
                  } else if (hasData) {
                    onSelect(type);
                  } else if (requestInput === type) {
                    setOpenFor(null);
                  } else {
                    setOpenFor(type);
                    setRequestText('');
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all ${
                  isActive
                    ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                    : hasData
                    ? 'bg-white/[0.04] text-white/60 hover:bg-white/[0.06] border border-white/[0.06]'
                    : 'bg-white/[0.02] text-white/35 hover:text-white/50 hover:bg-white/[0.04] border border-white/[0.04]'
                }`}
              >
                {isGenerating ? (
                  <Loader2 className={`w-3.5 h-3.5 animate-spin ${config.color}`} />
                ) : (
                  <Icon className={`w-3.5 h-3.5 ${hasData ? config.color : ''}`} />
                )}
                {config.label}
                {hasData && !isGenerating && (
                  <span className="text-[9px] text-white/25 ml-0.5">✓</span>
                )}
                {!hasData && !isGenerating && (
                  <ChevronDown className={`w-3 h-3 transition-transform ${requestInput === type ? 'rotate-180' : ''}`} />
                )}
              </motion.button>

              <AnimatePresence>
                {requestInput === type && !hasData && (
                  <motion.div
                    initial={reducedMotion ? false : { opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.96 }}
                    transition={reducedMotion ? { duration: 0 } : transitionFast}
                    className="absolute top-full left-0 mt-2 z-10 w-72"
                  >
                    <div className="liquid-glass rounded-xl p-3 space-y-2">
                      <p className="text-[11px] text-white/40">
                        Optional: Describe what you want in the {SECTION_CONFIG[type].label.toLowerCase()} section
                      </p>
                      <input
                        type="text"
                        value={requestText}
                        onChange={(e) => setRequestText(e.target.value)}
                        placeholder="e.g., Focus on API integration..."
                        className="w-full px-3 py-2 text-[12px] text-white/80 bg-white/[0.04] border border-white/[0.08] rounded-lg placeholder:text-white/20 focus:outline-none focus:border-white/[0.15] transition-colors"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleGenerate(type);
                          if (e.key === 'Escape') {
                            setOpenFor(null);
                            setRequestText('');
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={reducedMotion ? {} : { scale: 1.02 }}
                          whileTap={reducedMotion ? {} : { scale: 0.98 }}
                          onClick={() => handleGenerate(type)}
                          className="flex-1 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.12] transition-colors"
                        >
                          Generate
                        </motion.button>
                        <motion.button
                          whileHover={reducedMotion ? {} : { scale: 1.02 }}
                          whileTap={reducedMotion ? {} : { scale: 0.98 }}
                          onClick={() => {
                            setOpenFor(null);
                            setRequestText('');
                          }}
                          className="px-3 py-1.5 text-[11px] text-white/30 hover:text-white/50 transition-colors"
                        >
                          Cancel
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
