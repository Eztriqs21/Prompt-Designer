import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Workspace, Run, RunEvent, CompletionSummary } from '../types/vibeloop';
import * as api from '../lib/apiClient';

interface VibeLoopState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeRun: Run | null;
  runEvents: RunEvent[];
  summary: CompletionSummary | null;
  loading: boolean;
  error: string | null;
}

interface VibeLoopContextType extends VibeLoopState {
  loadWorkspaces: () => Promise<void>;
  selectWorkspace: (id: string) => Promise<void>;
  createWorkspace: (data: any) => Promise<Workspace>;
  updateWorkspace: (id: string, patch: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  revokeKey: (id: string) => Promise<void>;
  startRun: (workspaceId: string) => Promise<void>;
  stopRun: (workspaceId: string) => Promise<void>;
  pollRunStatus: () => Promise<void>;
  loadRunHistory: (workspaceId: string) => Promise<void>;
  loadRunEvents: (runId: string) => Promise<void>;
  loadSummary: (runId: string) => Promise<void>;
  clearError: () => void;
}

const VibeLoopContext = createContext<VibeLoopContextType | null>(null);

export function VibeLoopProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VibeLoopState>({
    workspaces: [],
    activeWorkspace: null,
    activeRun: null,
    runEvents: [],
    summary: null,
    loading: false,
    error: null,
  });

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadWorkspaces = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const workspaces = await api.listWorkspaces();
      setState((s) => ({ ...s, workspaces, loading: false }));
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, []);

  const selectWorkspace = useCallback(async (id: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const workspace = await api.getWorkspace(id);
      const runs = await api.getRunHistory(id);
      const activeRun = runs.find((r) => r.status === 'running') || null;
      setState((s) => ({
        ...s,
        activeWorkspace: workspace,
        activeRun,
        loading: false,
      }));
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, []);

  const createWorkspace = useCallback(async (data: any) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const workspace = await api.createWorkspace(data);
      setState((s) => ({
        ...s,
        workspaces: [workspace, ...s.workspaces],
        activeWorkspace: workspace,
        loading: false,
      }));
      return workspace;
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
      throw err;
    }
  }, []);

  const updateWorkspace = useCallback(async (id: string, patch: Partial<Workspace>) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const updated = await api.updateWorkspace(id, patch);
      setState((s) => ({
        ...s,
        workspaces: s.workspaces.map((w) => (w.id === id ? updated : w)),
        activeWorkspace: s.activeWorkspace?.id === id ? updated : s.activeWorkspace,
        loading: false,
      }));
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, []);

  const deleteWorkspace = useCallback(async (id: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await api.deleteWorkspace(id);
      setState((s) => ({
        ...s,
        workspaces: s.workspaces.filter((w) => w.id !== id),
        activeWorkspace: s.activeWorkspace?.id === id ? null : s.activeWorkspace,
        loading: false,
      }));
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, []);

  const revokeKey = useCallback(async (id: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const updated = await api.revokeWorkspaceKey(id);
      setState((s) => ({
        ...s,
        workspaces: s.workspaces.map((w) => (w.id === id ? updated : w)),
        activeWorkspace: s.activeWorkspace?.id === id ? updated : s.activeWorkspace,
        loading: false,
      }));
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, []);

  const startRun = useCallback(async (workspaceId: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const run = await api.startRun(workspaceId);
      setState((s) => ({ ...s, activeRun: run, loading: false }));
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, []);

  const stopRun = useCallback(async (workspaceId: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const run = await api.stopRun(workspaceId);
      setState((s) => ({ ...s, activeRun: run, loading: false }));
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, []);

  const pollRunStatus = useCallback(async () => {
    if (!state.activeRun) return;
    try {
      const run = await api.getRun(state.activeRun.id);
      setState((s) => ({ ...s, activeRun: run }));
    } catch (err: any) {
      console.error('Poll failed:', err);
    }
  }, [state.activeRun]);

  const loadRunHistory = useCallback(async (workspaceId: string) => {
    try {
      const runs = await api.getRunHistory(workspaceId);
      const activeRun = runs.find((r) => r.status === 'running') || null;
      setState((s) => ({ ...s, activeRun }));
    } catch (err: any) {
      console.error('Failed to load run history:', err);
    }
  }, []);

  const loadRunEvents = useCallback(async (runId: string) => {
    try {
      const events = await api.getRunEvents(runId);
      setState((s) => ({ ...s, runEvents: events }));
    } catch (err: any) {
      console.error('Failed to load run events:', err);
    }
  }, []);

  const loadSummary = useCallback(async (runId: string) => {
    try {
      const summary = await api.getRunSummary(runId);
      setState((s) => ({ ...s, summary }));
    } catch (err: any) {
      console.error('Failed to load summary:', err);
    }
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  // Auto-poll active runs
  useEffect(() => {
    if (state.activeRun && state.activeRun.status === 'running') {
      pollRef.current = setInterval(pollRunStatus, 3000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [state.activeRun, pollRunStatus]);

  return (
    <VibeLoopContext.Provider
      value={{
        ...state,
        loadWorkspaces,
        selectWorkspace,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        revokeKey,
        startRun,
        stopRun,
        pollRunStatus,
        loadRunHistory,
        loadRunEvents,
        loadSummary,
        clearError,
      }}
    >
      {children}
    </VibeLoopContext.Provider>
  );
}

export function useVibeLoopContext() {
  const context = useContext(VibeLoopContext);
  if (!context) {
    throw new Error('useVibeLoopContext must be used within a VibeLoopProvider');
  }
  return context;
}
