import { memo } from 'react';
import { Code, Palette, ShieldCheck, Loader2, ChevronRight } from 'lucide-react';
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
    color: 'text-accent-success',
    description: 'Implementation brief for your coding agent',
  },
  'ui-ux': {
    label: 'UI/UX',
    icon: Palette,
    color: 'text-accent-info',
    description: 'Design specification for your coding agent',
  },
  audit: {
    label: 'Audit',
    icon: ShieldCheck,
    color: 'text-accent-warning',
    description: 'Structured review brief for your coding agent',
  },
};

export default memo(function SectionCard({ type, state, isActive, onClick }: SectionCardProps) {
  const config = SECTION_CONFIG[type];
  const Icon = config.icon;
  const hasData = !!state.data;
  const isGenerating = state.isGenerating;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-md border transition-colors duration-150 ${
        isActive
          ? 'bg-surface-alt border-ink-muted/20'
          : hasData
          ? 'bg-surface-alt border-border-soft hover:border-ink-muted/30'
          : 'bg-surface-base border-border-soft hover:border-ink-muted/20'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-md ${isActive ? 'bg-surface-base' : 'bg-surface-alt'}`}>
          {isGenerating ? (
            <Loader2 className={`w-4 h-4 animate-spin ${config.color}`} />
          ) : (
            <Icon className={`w-4 h-4 ${hasData ? config.color : 'text-ink-muted'}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`text-sm font-medium ${isActive ? 'text-ink-primary' : hasData ? 'text-ink-primary' : 'text-ink-muted'}`}>
              {config.label}
            </h4>
            {hasData && !isGenerating && (
              <span className="text-xs text-accent-success font-medium">Ready</span>
            )}
            {isGenerating && (
              <span className="text-xs text-ink-muted font-medium">Generating...</span>
            )}
          </div>
          <p className={`text-xs mt-0.5 ${isActive ? 'text-ink-muted' : 'text-ink-muted/60'}`}>
            {config.description}
          </p>
          {state.error && (
            <p className="text-xs mt-1 text-accent-error">Failed to generate</p>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 shrink-0 mt-1 transition-colors ${
          isActive ? 'text-ink-muted' : 'text-ink-muted/40'
        }`} />
      </div>
    </button>
  );
});
