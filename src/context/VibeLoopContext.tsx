import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Workspace, Run, RunEvent, CompletionSummary } from '../types/vibeloop';
import * as api from '../lib/apiClient';

interface VibeLoopState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeRun: Run | null;
  runHistory: Run[];
  runEvents: RunEvent[];
  summary: CompletionSummary | null;
  loading: boolean;
  error: string | null;
}

interface VibeLoopContextValue extends VibeLoopState {
  loadWorkspaces: () => Promise<void>;
  selectWorkspace: (id: string) => Promise<void>;
  createWorkspace: (data: any) => Promise<Workspace>;
  updateWorkspace: (id: string, patch: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  revokeKey: (id: string) => Promise<void>;
  startRun: (workspaceId: string) => Promise<void>;
  stopRun: (workspaceId: string) => Promise<void>;
  pollRunStatus: (runId: string) => Promise<void>;
  loadRunHistory: (workspaceId: string) => Promise<void>;
  loadRunEvents: (runId: string) => Promise<void>;
  loadSummary: (runId: string) => Promise<void>;
  clearError: () => void;
}

const VibeLoopContext = createContext<VibeLoopContextValue | null>(null);

const POLL_INTERVAL = 3000;

export function VibeLoopProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [activeRun, setActiveRun] = useState<Run | null>(null);
  const [runHistory, setRunHistory] = useState<Run[]>([]);
  const [runEvents, setRunEvents] = useState<RunEvent[]>([]);
  const [summary, setSummary] = useState<CompletionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      const ws = await api.listWorkspaces();
      setWorkspaces(ws);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectWorkspace = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const ws = await api.getWorkspace(id);
      setActiveWorkspace(ws);
      // Check for active run
      const runs = await api.getRunHistory(id);
      setRunHistory(runs);
      const active = runs.find((r) => r.status === 'running' || r.status === 'paused');
      setActiveRun(active || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorkspaceHandler = useCallback(async (data: any): Promise<Workspace> => {
    const ws = await api.createWorkspace(data);
    setWorkspaces((prev) => [ws, ...prev]);
    return ws;
  }, []);

  const updateWorkspaceHandler = useCallback(async (id: string, patch: Partial<Workspace>) => {
    const updated = await api.updateWorkspace(id, patch);
    setActiveWorkspace(updated);
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? updated : w)));
  }, []);

  const deleteWorkspaceHandler = useCallback(async (id: string) => {
    await api.deleteWorkspace(id);
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    if (activeWorkspace?.id === id) setActiveWorkspace(null);
  }, [activeWorkspace]);

  const revokeKeyHandler = useCallback(async (id: string) => {
    const updated = await api.revokeWorkspaceKey(id);
    setActiveWorkspace(updated);
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? updated : w)));
  }, []);

  const startRunHandler = useCallback(async (workspaceId: string) => {
    const run = await api.startRun(workspaceId);
    setActiveRun(run);
    // Update workspace status
    const ws = await api.getWorkspace(workspaceId);
    setActiveWorkspace(ws);
    setWorkspaces((prev) => prev.map((w) => (w.id === workspaceId ? ws : w)));
  }, []);

  const stopRunHandler = useCallback(async (workspaceId: string) => {
    await api.stopRun(workspaceId);
    setActiveRun(null);
    const ws = await api.getWorkspace(workspaceId);
    setActiveWorkspace(ws);
    setWorkspaces((prev) => prev.map((w) => (w.id === workspaceId ? ws : w)));
  }, []);

  const pollRunStatus = useCallback(async (runId: string) => {
    try {
      const run = await api.getRun(runId);
      setActiveRun(run);
      if (run.status === 'completed' || run.status === 'failed' || run.status === 'stopped') {
        // Load summary
        const sum = await api.getRunSummary(runId);
        setSummary(sum);
      }
    } catch (err: any) {
      console.error('Poll failed:', err);
    }
  }, []);

  const loadRunHistory = useCallback(async (workspaceId: string) => {
    const runs = await api.getRunHistory(workspaceId);
    setRunHistory(runs);
  }, []);

  const loadRunEvents = useCallback(async (runId: string) => {
    const events = await api.getRunEvents(runId);
    setRunEvents(events);
  }, []);

  const loadSummary = useCallback(async (runId: string) => {
    const sum = await api.getRunSummary(runId);
    setSummary(sum);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Polling effect for active runs
  useEffect(() => {
    if (!activeRun || activeRun.status === 'completed' || activeRun.status === 'failed' || activeRun.status === 'stopped') {
      return;
    }

    const interval = setInterval(() => {
      pollRunStatus(activeRun.id);
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [activeRun?.id, activeRun?.status, pollRunStatus]);

  // Load workspaces on mount
  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  return (
    <VibeLoopContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        activeRun,
        runHistory,
        runEvents,
        summary,
        loading,
        error,
        loadWorkspaces,
        selectWorkspace,
        createWorkspace: createWorkspaceHandler,
        updateWorkspace: updateWorkspaceHandler,
        deleteWorkspace: deleteWorkspaceHandler,
        revokeKey: revokeKeyHandler,
        startRun: startRunHandler,
        stopRun: stopRunHandler,
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

export function useVibeLoopContext(): VibeLoopContextValue {
  const ctx = useContext(VibeLoopContext);
  if (!ctx) throw new Error('useVibeLoopContext must be used within VibeLoopProvider');
  return ctx;
}
