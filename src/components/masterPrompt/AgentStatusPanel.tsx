import { Code, Palette, ShieldCheck } from 'lucide-react';
import type { SectionType, SectionState } from '../../types';

export type SectionStatus = 'idle' | 'working' | 'completed' | 'waiting-for-input' | 'error';

export function deriveStatus(state: SectionState): SectionStatus {
  if (state.error) return 'error';
  if (state.isGenerating) return 'working';
  if (state.data) return 'waiting-for-input';
  return 'idle';
}

const META: Record<SectionType, { label: string; icon: typeof Code; color: string }> = {
  coding: { label: 'Coding', icon: Code, color: 'text-accent-orange' },
  'ui-ux': { label: 'UI/UX', icon: Palette, color: 'text-accent-orange' },
  audit: { label: 'Audit', icon: ShieldCheck, color: 'text-secondary-midGray' },
};

const STATUS_LABEL: Record<SectionStatus, string> = {
  idle: 'Idle',
  working: 'Working',
  completed: 'Completed',
  'waiting-for-input': 'Waiting for input',
  error: 'Error',
};

const STATUS_DOT: Record<SectionStatus, string> = {
  idle: 'bg-secondary-midGray',
  working: 'bg-accent-orange',
  completed: 'bg-success-green',
  'waiting-for-input': 'bg-accent-purple',
  error: 'bg-semantic-dangerRed',
};

interface AgentStatusPanelProps {
  sections: Record<SectionType, SectionState>;
}

export default function AgentStatusPanel({ sections }: AgentStatusPanelProps) {
  const types = Object.keys(META) as SectionType[];

  return (
    <div className="flex flex-wrap gap-2" aria-label="Agent status">
      {types.map((type) => {
        const status = deriveStatus(sections[type]);
        const { label, icon: Icon, color } = META[type];
        return (
          <div
            key={type}
            className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-secondary-darkSurface border border-secondary-borderGray"
          >
            <Icon className={`w-3.5 h-3.5 ${color}`} />
            <span className="text-small text-secondary-midGray">{label}</span>
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} aria-hidden="true" />
            <span className="text-small text-secondary-midGray">{STATUS_LABEL[status]}</span>
          </div>
        );
      })}
    </div>
  );
}
