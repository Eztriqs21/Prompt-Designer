import { useRef, useEffect } from 'react';
import { useWorkflow } from '../../hooks/useWorkflow';
import SectionSelector from './SectionSelector';
import AgentStatusPanel from './AgentStatusPanel';
import SectionConversation from './SectionConversation';
import Button from '../ui/Button';
import type { SectionType, SectionState } from '../../types';
import type { SectionMessage } from '../../lib/apiClient';

const SECTION_TYPES: SectionType[] = ['coding', 'ui-ux', 'audit'];

interface WorkflowPanelProps {
  sections: Record<SectionType, SectionState>;
  sectionMessages: Record<SectionType, SectionMessage[]>;
  generateSection: (type: SectionType, userRequest?: string) => Promise<void>;
  onRun: (input: string, selected: SectionType[]) => void;
}

export default function WorkflowPanel({
  sections,
  sectionMessages,
  generateSection,
  onRun,
}: WorkflowPanelProps) {
  const { selectedSections, continuationInput, setContinuationInput, stage } = useWorkflow();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [continuationInput]);

  const isAnyGenerating = SECTION_TYPES.some((t) => sections[t].isGenerating);
  const canRun = selectedSections.length > 0 && !isAnyGenerating;

  const usedTypes = SECTION_TYPES.filter((t) => sections[t].data || sections[t].isGenerating);
  const laneTypes = Array.from(new Set([...selectedSections, ...usedTypes]));

  const handleRun = () => {
    if (!canRun) return;
    onRun(continuationInput, selectedSections);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 sm:px-6 py-4 border-t border-secondary-borderGray space-y-3 shrink-0">
        <div className="text-small text-secondary-midGray uppercase tracking-wider">
          Continue {stage === 'multi-agent' ? '· running agents' : ''}
        </div>

        <textarea
          ref={textareaRef}
          value={continuationInput}
          onChange={(e) => setContinuationInput(e.target.value)}
          placeholder="Paste the coding agent's reply or describe the next step..."
          rows={2}
          className="w-full bg-secondary-darkSurface border border-secondary-borderGray rounded-md px-3 py-2 text-body text-primary-light placeholder:text-secondary-midGray resize-none outline-none focus:border-accent-orange/30 transition-colors"
        />

        <div className="flex flex-wrap items-center gap-3">
          <SectionSelector />
          <Button variant="primary" size="sm" onClick={handleRun} disabled={!canRun} aria-busy={isAnyGenerating}>
            {isAnyGenerating ? 'Running…' : 'Run selected'}
          </Button>
        </div>

        <AgentStatusPanel sections={sections} />
      </div>

      {laneTypes.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {laneTypes.map((type) => (
              <SectionConversation
                key={type}
                sectionType={type}
                state={sections[type]}
                messages={sectionMessages[type]}
                onGenerate={(request) => generateSection(type, request)}
                onLoadMessages={() => Promise.resolve()}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
