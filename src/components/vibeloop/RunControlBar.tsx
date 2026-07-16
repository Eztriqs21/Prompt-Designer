import { Play, Square, Loader2 } from 'lucide-react';
import type { Workspace, Run } from '../../types/vibeloop';
import { useVibeLoopContext } from '../../context/VibeLoopContext';

interface Props {
  workspace: Workspace;
  run: Run | null;
}

export default function RunControlBar({ workspace, run }: Props) {
  const { startRun, stopRun, loading } = useVibeLoopContext();

  const isRunning = run && (run.status === 'running' || run.status === 'paused');
  const isIdle = !run || run.status === 'completed' || run.status === 'failed' || run.status === 'stopped';

  const handleStart = async () => {
    await startRun(workspace.id);
  };

  const handleStop = async () => {
    await stopRun(workspace.id);
  };

  return (
    <div className="flex items-center gap-3">
      {isIdle ? (
        <button
          onClick={handleStart}
          disabled={loading || workspace.status === 'active'}
          className="flex items-center gap-2 px-4 py-2 text-small font-medium rounded-md bg-success-green/10 border border-success-green/30 text-success-green hover:bg-success-green/20 transition-colors disabled:opacity-40"
        >
          <Play className="w-4 h-4" />
          Run Automation
        </button>
      ) : (
        <button
          onClick={handleStop}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-small font-medium rounded-md bg-semantic-dangerRed/10 border border-semantic-dangerRed/30 text-semantic-dangerRed hover:bg-semantic-dangerRed/20 transition-colors disabled:opacity-40"
        >
          <Square className="w-4 h-4" />
          Stop
        </button>
      )}

      {isRunning && (
        <div className="flex items-center gap-2 text-small text-accent-orange">
          <Loader2 className="w-4 h-4 animate-spin" />
          {run.stage.replace(/_/g, ' ')}
          <span className="text-secondary-midGray">· iteration {run.iteration}</span>
        </div>
      )}
    </div>
  );
}
