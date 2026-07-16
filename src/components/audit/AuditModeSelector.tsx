import { memo } from 'react';
import { Code, Sparkles, ShieldCheck } from 'lucide-react';
import Chip from '../ui/Chip';
import type { AuditMode } from '../../types';

interface AuditModeSelectorProps {
  value: AuditMode;
  onChange: (mode: AuditMode) => void;
  disabled?: boolean;
}

const MODE_CONFIG: Record<
  AuditMode,
  { label: string; icon: typeof Code; description: string; bullets: string[]; recommended?: boolean }
> = {
  basic: {
    label: 'Basic',
    icon: Code,
    description: 'Code-only analysis. Fast structural review and obvious bug detection.',
    bullets: ['Static code analysis', 'HTML / CSS / JS inspection', 'Broken asset detection'],
  },
  recommended: {
    label: 'Recommended',
    icon: Sparkles,
    description: 'Code analysis plus light browser testing and key UI checks.',
    bullets: ['Everything in Basic', 'Light browser testing', 'Security header checks'],
    recommended: true,
  },
  full: {
    label: 'Full',
    icon: ShieldCheck,
    description: 'Full browser testing, accessibility, responsiveness, and evidence capture.',
    bullets: ['Everything in Recommended', 'Accessibility & performance', 'Screenshot evidence'],
  },
};

const MODES: AuditMode[] = ['basic', 'recommended', 'full'];

export default memo(function AuditModeSelector({ value, onChange, disabled }: AuditModeSelectorProps) {
  return (
    <div className="space-y-3">
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
              className={`relative text-left rounded-md border p-4 transition-colors duration-150 ${
                isActive
                  ? 'border-accent-blue bg-primary-light/5'
                  : 'border-secondary-borderGray bg-secondary-darkSurface hover:border-accent-blue/30'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {config.recommended && (
                <div className="absolute top-3 right-3">
                  <Chip variant="accent">Recommended</Chip>
                </div>
              )}

              <div className="flex items-center gap-2.5 mb-2">
                <Icon className={`w-5 h-5 ${isActive ? 'text-accent-blue' : 'text-secondary-midGray'}`} />
                <span className="text-subheading text-primary-light">{config.label}</span>
              </div>

              <p className={`text-small leading-relaxed mb-3 ${isActive ? 'text-secondary-midGray' : 'text-secondary-midGray/70'}`}>
                {config.description}
              </p>

              <ul className="space-y-1.5">
                {config.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-small text-secondary-midGray">
                    <span className="text-secondary-midGray/40 mt-0.5 shrink-0">—</span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <p className="text-small text-secondary-midGray">Recommended is the default balance of speed and coverage.</p>
    </div>
  );
});
