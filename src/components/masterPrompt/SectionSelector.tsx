import { Code, Palette, ShieldCheck } from 'lucide-react';
import type { SectionType } from '../../types';
import { useWorkflow } from '../../hooks/useWorkflow';

const OPTIONS: { type: SectionType; label: string; icon: typeof Code; color: string }[] = [
  { type: 'coding', label: 'Coding', icon: Code, color: 'text-accent-orange' },
  { type: 'ui-ux', label: 'UI/UX', icon: Palette, color: 'text-accent-orange' },
  { type: 'audit', label: 'Audit', icon: ShieldCheck, color: 'text-secondary-midGray' },
];

export default function SectionSelector() {
  const { selectedSections, toggleSection } = useWorkflow();

  return (
    <div role="group" aria-label="Select sections to run" className="flex flex-wrap gap-2">
      {OPTIONS.map(({ type, label, icon: Icon, color }) => {
        const active = selectedSections.includes(type);
        return (
          <button
            key={type}
            type="button"
            aria-pressed={active}
            onClick={() => toggleSection(type)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-small font-medium border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-orange/40 ${
              active
                ? 'bg-accent-orange text-primary-dark border-accent-orange'
                : 'bg-secondary-darkSurface text-secondary-midGray border-secondary-borderGray hover:text-primary-light hover:border-accent-orange/30'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${active ? 'text-primary-dark' : color}`} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
