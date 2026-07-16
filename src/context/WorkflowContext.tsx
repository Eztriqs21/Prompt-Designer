import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { SectionType } from '../types';

export type WorkflowStage = 'idea' | 'master' | 'continuation' | 'multi-agent';

export const ALL_SECTIONS: SectionType[] = ['coding', 'ui-ux', 'audit'];

interface WorkflowContextValue {
  stage: WorkflowStage;
  selectedSections: SectionType[];
  continuationInput: string;
  setStage: (stage: WorkflowStage) => void;
  toggleSection: (type: SectionType) => void;
  setSelectedSections: (types: SectionType[]) => void;
  setContinuationInput: (value: string) => void;
  resetWorkflow: () => void;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<WorkflowStage>('idea');
  const [selectedSections, setSelectedSections] = useState<SectionType[]>([]);
  const [continuationInput, setContinuationInput] = useState('');

  const toggleSection = useCallback((type: SectionType) => {
    setSelectedSections((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const resetWorkflow = useCallback(() => {
    setStage('idea');
    setSelectedSections([]);
    setContinuationInput('');
  }, []);

  const value: WorkflowContextValue = {
    stage,
    selectedSections,
    continuationInput,
    setStage,
    toggleSection,
    setSelectedSections,
    setContinuationInput,
    resetWorkflow,
  };

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflowContextValue(): WorkflowContextValue {
  const ctx = useContext(WorkflowContext);
  if (!ctx) {
    throw new Error('useWorkflow must be used within WorkflowProvider');
  }
  return ctx;
}
