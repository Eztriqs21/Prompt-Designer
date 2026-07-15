import { memo } from 'react';
import { motion } from 'framer-motion';
import { Code, Palette, ShieldCheck, Loader2, ChevronRight } from 'lucide-react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { hoverScaleSmall } from '../../motion/presets';
import type { SectionType, SectionState } from '../../types';

interface SectionCardProps {
  type: SectionType;
  state: SectionState;
  isActive: boolean;
  onClick: () => void;
}

const SECTION_CONFIG: Record<SectionType, { label: string; icon: typeof Code; color: string; description: string }> = {
  coding: {
    label: 'Coding',
    icon: Code,
    color: 'text-emerald-400',
    description: 'Implementation brief for your coding agent',
  },
  'ui-ux': {
    label: 'UI/UX',
    icon: Palette,
    color: 'text-violet-400',
    description: 'Design specification for your coding agent',
  },
  audit: {
    label: 'Audit',
    icon: ShieldCheck,
    color: 'text-amber-400',
    description: 'Structured review brief for your coding agent',
  },
};

export default memo(function SectionCard({ type, state, isActive, onClick }: SectionCardProps) {
  const reducedMotion = useReducedMotionSafe();
  const config = SECTION_CONFIG[type];
  const Icon = config.icon;
  const hasData = !!state.data;
  const isGenerating = state.isGenerating;

  return (
    <motion.button
      {...(reducedMotion ? {} : hoverScaleSmall)}
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isActive
          ? 'bg-white/[0.08] border-white/[0.12] ring-1 ring-white/[0.06]'
          : hasData
          ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.08]'
          : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.06]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${isActive ? 'bg-white/[0.08]' : 'bg-white/[0.04]'}`}>
          {isGenerating ? (
            <Loader2 className={`w-4 h-4 animate-spin ${config.color}`} />
          ) : (
            <Icon className={`w-4 h-4 ${hasData ? config.color : 'text-white/30'}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`text-[13px] font-medium ${isActive ? 'text-white' : hasData ? 'text-white/70' : 'text-white/40'}`}>
              {config.label}
            </h4>
            {hasData && !isGenerating && (
              <span className="text-[10px] text-emerald-400/60 font-medium">Ready</span>
            )}
            {isGenerating && (
              <span className="text-[10px] text-white/30 font-medium">Generating...</span>
            )}
          </div>
          <p className={`text-[11px] mt-0.5 ${isActive ? 'text-white/50' : 'text-white/25'}`}>
            {config.description}
          </p>
          {state.error && (
            <p className="text-[11px] mt-1 text-red-400/60">Failed to generate</p>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 shrink-0 mt-1 transition-colors ${
          isActive ? 'text-white/40' : 'text-white/15'
        }`} />
      </div>
    </motion.button>
  );
});
