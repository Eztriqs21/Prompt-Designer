import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Play, Square, RefreshCw } from 'lucide-react';
import { useVibeLoop } from '../hooks/useVibeLoop';

export default function VibeLoopWorkspace() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const {
    activeWorkspace,
    activeRun,
    runEvents,
    summary,
    loading,
    error,
    selectWorkspace,
    startRun,
    stopRun,
    loadRunEvents,
    loadSummary,
  } = useVibeLoop();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'prompt' | 'response'>('overview');

  useEffect(() => {
    if (workspaceId) {
      selectWorkspace(workspaceId);
    }
  }, [workspaceId, selectWorkspace]);

  useEffect(() => {
    if (activeRun) {
      loadRunEvents(activeRun.id);
    }
  }, [activeRun, loadRunEvents]);

  useEffect(() => {
    if (activeRun && (activeRun.status === 'completed' || activeRun.stage === 'complete')) {
      loadSummary(activeRun.id);
    }
  }, [activeRun, loadSummary]);

  const handleCopyKey = async () => {
    if (activeWorkspace) {
      await navigator.clipboard.writeText(activeWorkspace.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStart = async () => {
    if (activeWorkspace) {
      await startRun(activeWorkspace.id);
    }
  };

  const handleStop = async () => {
    if (activeWorkspace) {
      await stopRun(activeWorkspace.id);
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="min-h-screen bg-primary-dark p-6">
        <div className="max-w-4xl mx-auto text-center py-12 text-secondary-midGray">
          {loading ? 'Loading workspace...' : 'Workspace not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-dark p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/vibeloop')}
            className="p-2 text-secondary-midGray hover:text-primary-light transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-primary-light">
              {activeWorkspace.projectName}
            </h1>
            <p className="text-sm text-secondary-midGray mt-1">
              {activeWorkspace.objective}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-semantic-dangerRed/10 border border-semantic-dangerRed/30 rounded-md text-semantic-dangerRed">
            {error}
          </div>
        )}

        {/* Workspace Key */}
        <div className="mb-6 p-4 bg-secondary-darkSurface border border-secondary-borderGray rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-secondary-midGray">Workspace Key</h3>
              <code className="text-xs text-primary-light font-mono break-all">
                {activeWorkspace.key}
              </code>
            </div>
            <button
              onClick={handleCopyKey}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-secondary-midGray hover:text-primary-light border border-secondary-borderGray rounded transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Run Controls */}
        <div className="mb-6 p-4 bg-secondary-darkSurface border border-secondary-borderGray rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-secondary-midGray">Automation</h3>
              {activeRun ? (
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeRun.status === 'running' ? 'bg-success-green animate-pulse' : 'bg-secondary-midGray'
                    }`}
                  />
                  <span className="text-sm text-primary-light">
                    {activeRun.status === 'running'
                      ? `${activeRun.stage} (iteration ${activeRun.iteration})`
                      : activeRun.status}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-secondary-midGray mt-1">No active run</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeRun?.status === 'running' ? (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-semantic-dangerRed border border-semantic-dangerRed/30 rounded hover:bg-semantic-dangerRed/10 transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-success-green border border-success-green/30 rounded hover:bg-success-green/10 transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  Start Run
                </button>
              )}
              <button
                onClick={() => selectWorkspace(activeWorkspace.id)}
                className="p-1.5 text-secondary-midGray hover:text-primary-light transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-secondary-borderGray">
          {(['overview', 'events', 'prompt', 'response'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'text-accent-orange border-accent-orange'
                  : 'text-secondary-midGray border-transparent hover:text-primary-light'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-secondary-darkSurface border border-secondary-borderGray rounded-lg p-4">
          {activeTab === 'overview' && (
            <div>
              <h3 className="text-lg font-medium text-primary-light mb-4">Checklist</h3>
              <div className="space-y-2">
                {activeWorkspace.checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded border border-secondary-borderGray"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.status === 'done'
                          ? 'bg-success-green'
                          : item.status === 'in_progress'
                          ? 'bg-warn-yellow'
                          : 'bg-secondary-midGray'
                      }`}
                    />
                    <div className="flex-1">
                      <span className="text-sm text-primary-light">{item.label}</span>
                      {item.description && (
                        <p className="text-xs text-secondary-midGray mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-secondary-midGray">{item.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              <h3 className="text-lg font-medium text-primary-light mb-4">Run Events</h3>
              {runEvents.length === 0 ? (
                <p className="text-sm text-secondary-midGray">No events yet</p>
              ) : (
                <div className="space-y-2">
                  {runEvents.map((event: any) => (
                    <div
                      key={event.id}
                      className="p-3 rounded border border-secondary-borderGray"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            event.type === 'error'
                              ? 'bg-semantic-dangerRed'
                              : event.type === 'state_change'
                              ? 'bg-accent-orange'
                              : 'bg-accent-purple'
                          }`}
                        />
                        <span className="text-sm font-medium text-primary-light">
                          {event.stage}
                        </span>
                        <span className="text-xs text-secondary-midGray">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="text-xs text-secondary-midGray overflow-x-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'prompt' && (
            <div>
              <h3 className="text-lg font-medium text-primary-light mb-4">Latest Prompt</h3>
              {activeRun?.latestPrompt ? (
                <pre className="text-sm text-primary-light font-mono whitespace-pre-wrap overflow-x-auto">
                  {activeRun.latestPrompt}
                </pre>
              ) : (
                <p className="text-sm text-secondary-midGray">No prompt generated yet</p>
              )}
            </div>
          )}

          {activeTab === 'response' && (
            <div>
              <h3 className="text-lg font-medium text-primary-light mb-4">Agent Response</h3>
              {activeRun?.latestResponse ? (
                <pre className="text-sm text-primary-light font-mono whitespace-pre-wrap overflow-x-auto">
                  {activeRun.latestResponse.message}
                </pre>
              ) : (
                <p className="text-sm text-secondary-midGray">No response received yet</p>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        {summary && (
          <div className="mt-6 p-4 bg-secondary-darkSurface border border-secondary-borderGray rounded-lg">
            <h3 className="text-lg font-medium text-primary-light mb-4">Completion Summary</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm text-secondary-midGray">Status</span>
                <p className="text-primary-light font-medium">{summary.status}</p>
              </div>
              <div>
                <span className="text-sm text-secondary-midGray">Duration</span>
                <p className="text-primary-light font-medium">{summary.duration}</p>
              </div>
              <div>
                <span className="text-sm text-secondary-midGray">Items Completed</span>
                <p className="text-primary-light font-medium">
                  {summary.completedItems}/{summary.totalItems}
                </p>
              </div>
              <div>
                <span className="text-sm text-secondary-midGray">Iterations</span>
                <p className="text-primary-light font-medium">{summary.iterations}</p>
              </div>
            </div>
            <p className="text-sm text-secondary-midGray">{summary.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
