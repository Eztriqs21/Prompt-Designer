import { useWorkflowContextValue } from '../context/WorkflowContext';

export function useWorkflow() {
  return useWorkflowContextValue();
}
