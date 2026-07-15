import { memo } from 'react';
import { Code, Sparkles, ShieldCheck } from 'lucide-react';
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
    color: 'text-accent-success',
    description: 'Code-only analysis. Fast structural review and obvious bug detection.',
  },
  recommended: {
    label: 'Recommended Audit',
    icon: Sparkles,
    color: 'text-accent-info',
    description: 'Code analysis plus light browser testing and key UI checks.',
    recommended: true,
  },
  full: {
    label: 'Full Audit',
    icon: ShieldCheck,
    color: 'text-accent-warning',
    description: 'Full browser testing, accessibility, responsiveness, and evidence capture.',
  },
};

const MODES: AuditMode[] = ['basic', 'recommended', 'full'];

export default memo(function AuditModeSelector({ value, onChange, disabled }: AuditModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {MODES.map((mode) => {
        const config = MODE_CONFIG[mode];
        const Icon = config.icon;
        const isActive = value === mode;

        return (
          <button
            key={mode}
            onClick={() => !disabled && onChange(mode)}
            disabled={disabled}
            className={`relative text-left p-4 rounded-md border transition-colors duration-150 ${
              isActive
                ? 'bg-surface-alt border-ink-muted/20'
                : 'bg-surface-base border-border-soft hover:border-ink-muted/20'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {config.recommended && (
              <span className="absolute top-3 right-3 text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-accent-info/10 text-accent-info border border-accent-info/20">
                Recommended
              </span>
            )}

            <div className="flex items-center gap-2.5 mb-2">
              <Icon className={`w-5 h-5 ${config.color}`} />
              <span className={`text-sm font-medium ${isActive ? 'text-ink-primary' : 'text-ink-muted'}`}>
                {config.label}
              </span>
            </div>

            <p className={`text-xs leading-relaxed ${isActive ? 'text-ink-muted' : 'text-ink-muted/60'}`}>
              {config.description}
            </p>

            {isActive && (
              <div className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-full ${config.color.replace('text-', 'bg-')}`} />
            )}
          </button>
        );
      })}
    </div>
  );
});
