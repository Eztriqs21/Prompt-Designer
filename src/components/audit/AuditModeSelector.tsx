import { memo } from 'react';
import { motion } from 'framer-motion';
import { Code, Sparkles, ShieldCheck } from 'lucide-react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { hoverScaleSmall } from '../../motion/presets';
import type { AuditMode } from '../../types';

interface AuditModeSelectorProps {
  value: AuditMode;
  onChange: (mode: AuditMode) => void;
  disabled?: boolean;
}

const MODE_CONFIG: Record<AuditMode, {
  label: string;
  icon: typeof Code;
  color: string;
  description: string;
  recommended?: boolean;
}> = {
  basic: {
    label: 'Basic Audit',
    icon: Code,
    color: 'text-emerald-400',
    description: 'Code-only analysis. Fast structural review and obvious bug detection.',
  },
  recommended: {
    label: 'Recommended Audit',
    icon: Sparkles,
    color: 'text-indigo-400',
    description: 'Code analysis plus light browser testing and key UI checks.',
    recommended: true,
  },
  full: {
    label: 'Full Audit',
    icon: ShieldCheck,
    color: 'text-amber-400',
    description: 'Full browser testing, accessibility, responsiveness, and evidence capture.',
  },
};

const MODES: AuditMode[] = ['basic', 'recommended', 'full'];

export default memo(function AuditModeSelector({ value, onChange, disabled }: AuditModeSelectorProps) {
  const reducedMotion = useReducedMotionSafe();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {MODES.map((mode) => {
        const config = MODE_CONFIG[mode];
        const Icon = config.icon;
        const isActive = value === mode;

        return (
          <motion.button
            key={mode}
            onClick={() => !disabled && onChange(mode)}
            disabled={disabled}
            {...(reducedMotion ? {} : hoverScaleSmall)}
            className={`relative text-left p-4 rounded-xl border transition-all duration-200 ${
              isActive
                ? 'bg-white/[0.08] border-white/[0.12] ring-1 ring-white/[0.06]'
                : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.08]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {config.recommended && (
              <span className="absolute top-3 right-3 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                Recommended
              </span>
            )}

            <div className="flex items-center gap-2.5 mb-2">
              <Icon className={`w-5 h-5 ${config.color}`} />
              <span className={`text-[13px] font-medium ${isActive ? 'text-white' : 'text-white/70'}`}>
                {config.label}
              </span>
            </div>

            <p className={`text-[11px] leading-relaxed ${isActive ? 'text-white/50' : 'text-white/30'}`}>
              {config.description}
            </p>

            {/* Selection indicator */}
            {isActive && (
              <motion.div
                layoutId="audit-mode-indicator"
                className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-full ${config.color.replace('text-', 'bg-')}`}
                transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
});
