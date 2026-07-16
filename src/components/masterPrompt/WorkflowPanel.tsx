import { useRef, useEffect, useState } from 'react';
import { Maximize2, Minimize2, Expand } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [fullscreen, setFullscreen] = useState(false);
  const [lanesExpanded, setLanesExpanded] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [continuationInput]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const isAnyGenerating = SECTION_TYPES.some((t) => sections[t].isGenerating);
  const canRun = selectedSections.length > 0 && !isAnyGenerating;

  const usedTypes = SECTION_TYPES.filter((t) => sections[t].data || sections[t].isGenerating);
  const laneTypes = Array.from(new Set([...selectedSections, ...usedTypes]));
  const laneCount = laneTypes.length;

  const handleRun = () => {
    if (!canRun) return;
    onRun(continuationInput, selectedSections);
  };

  // Dynamic grid: 1 lane = 1 col, 2 lanes = 2 cols, 3 lanes = 3 cols
  const gridCols = laneCount === 1 ? 'grid-cols-1' : laneCount === 2 ? 'grid-cols-2' : 'grid-cols-3';

  const showLanes = laneTypes.length > 0;
  const isExpanded = lanesExpanded || fullscreen;

  const panel = (
    <div className="flex flex-col h-full min-h-0">
      {/* Controls header */}
      <div className="px-5 sm:px-8 py-5 border-t border-secondary-borderGray shrink-0">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="text-small text-secondary-midGray uppercase tracking-wider">
              Agents {stage === 'multi-agent' ? '· running' : ''}
            </div>
            <div className="flex items-center gap-2">
              {showLanes && (
                <button
                  onClick={() => setLanesExpanded((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-small font-medium rounded-md bg-accent-orange/10 border border-accent-orange/30 text-accent-orange hover:bg-accent-orange/20 transition-colors"
                >
                  <Expand className="w-3.5 h-3.5" />
                  {isExpanded ? 'Collapse' : 'Expand'}
                </button>
              )}
              <button
                onClick={() => setFullscreen((v) => !v)}
                aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen all agents'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-small font-medium rounded-md bg-primary-dark border border-secondary-borderGray text-secondary-midGray hover:text-accent-orange hover:border-accent-orange/30 transition-colors"
              >
                {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                {fullscreen ? 'Exit' : 'Fullscreen'}
              </button>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={continuationInput}
            onChange={(e) => setContinuationInput(e.target.value)}
            placeholder="Paste the coding agent's reply or describe the next step..."
            rows={2}
            className="w-full bg-secondary-darkSurface border border-secondary-borderGray rounded-md px-4 py-2.5 text-body text-primary-light placeholder:text-secondary-midGray resize-none outline-none focus:border-accent-orange/30 transition-colors"
          />

          {/* Selector + button row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SectionSelector />
            <Button variant="primary" size="sm" onClick={handleRun} disabled={!canRun} aria-busy={isAnyGenerating}>
              {isAnyGenerating ? 'Running…' : 'Run selected'}
            </Button>
          </div>

          {/* Status panel */}
          <AgentStatusPanel sections={sections} />
        </div>
      </div>

      {/* Lanes */}
      {showLanes && (
        <>
          <div className="mx-5 sm:mx-8 border-t border-secondary-borderGray" />
          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-5 min-h-0">
            <div className="max-w-5xl mx-auto">
              {/* Collapsed: header bars in a flex row */}
              {!isExpanded && (
                <div className="flex flex-wrap gap-3">
                  {laneTypes.map((type) => (
                    <div key={type} className="flex-1 min-w-[200px]">
                      <SectionConversation
                        sectionType={type}
                        state={sections[type]}
                        messages={sectionMessages[type]}
                        onGenerate={(request) => generateSection(type, request)}
                        onLoadMessages={() => Promise.resolve()}
                        headerOnly
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Expanded: full content grid */}
              {isExpanded && (
                <div className={`grid ${gridCols} gap-5 h-full`}>
                  {laneTypes.map((type) => (
                    <div key={type} className="min-h-0">
                      <SectionConversation
                        sectionType={type}
                        state={sections[type]}
                        messages={sectionMessages[type]}
                        onGenerate={(request) => generateSection(type, request)}
                        onLoadMessages={() => Promise.resolve()}
                        compact
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <AnimatePresence>
        <motion.div
          key="workflow-fullscreen"
          className="fixed inset-0 z-50 bg-primary-dark flex p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <motion.div
            className="w-full"
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ height: 'calc(100vh - 32px)' }}
          >
            {panel}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return panel;
}
