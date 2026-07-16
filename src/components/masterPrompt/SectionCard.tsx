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
    color: 'text-accent-blue',
    description: 'Implementation brief for your coding agent',
  },
  'ui-ux': {
    label: 'UI/UX',
    icon: Palette,
    color: 'text-accent-blue',
    description: 'Design specification for your coding agent',
  },
  audit: {
    label: 'Audit',
    icon: ShieldCheck,
    color: 'text-secondary-midGray',
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
          ? 'bg-secondary-darkSurface border-accent-blue/30'
          : hasData
          ? 'bg-secondary-darkSurface border-secondary-borderGray hover:border-accent-blue/20'
          : 'bg-primary-dark border-secondary-borderGray hover:border-secondary-borderGray'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-md ${isActive ? 'bg-primary-dark' : 'bg-secondary-darkSurface'}`}>
          {isGenerating ? (
            <Loader2 className={`w-4 h-4 animate-spin ${config.color}`} />
          ) : (
            <Icon className={`w-4 h-4 ${hasData ? config.color : 'text-secondary-midGray'}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`text-body font-medium ${isActive ? 'text-accent-blue' : hasData ? 'text-primary-light' : 'text-secondary-midGray'}`}>
              {config.label}
            </h4>
            {hasData && !isGenerating && (
              <span className="text-small text-accent-blue font-medium">Ready</span>
            )}
            {isGenerating && (
              <span className="text-small text-secondary-midGray font-medium">Generating...</span>
            )}
          </div>
          <p className={`text-small mt-0.5 ${isActive ? 'text-secondary-midGray' : 'text-secondary-midGray/60'}`}>
            {config.description}
          </p>
          {state.error && (
            <p className="text-small mt-1 text-semantic-dangerRed">Failed to generate</p>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 shrink-0 mt-1 transition-colors ${
          isActive ? 'text-accent-blue' : 'text-secondary-midGray/40'
        }`} />
      </div>
    </button>
  );
});
