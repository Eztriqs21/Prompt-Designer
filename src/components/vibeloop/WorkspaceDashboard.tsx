import { useState } from 'react';
import type { Workspace } from '../../types/vibeloop';
import { useVibeLoopContext } from '../../context/VibeLoopContext';
import WorkspaceKeyCard from './WorkspaceKeyCard';
import ConnectionStatus from './ConnectionStatus';
import RunControlBar from './RunControlBar';
import FeatureChecklistEditor from './FeatureChecklistEditor';
import LiveTimeline from './LiveTimeline';
import PromptViewer from './PromptViewer';
import AgentResponseViewer from './AgentResponseViewer';
import AuditSummaryPanel from './AuditSummaryPanel';
import IssueTracker from './IssueTracker';
import CompletionReport from './CompletionReport';

interface Props {
  workspace: Workspace;
}

type Tab = 'overview' | 'timeline' | 'prompt' | 'response' | 'audit' | 'issues' | 'checklist';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'prompt', label: 'Prompt' },
  { key: 'response', label: 'Response' },
  { key: 'audit', label: 'Audit' },
  { key: 'issues', label: 'Issues' },
  { key: 'checklist', label: 'Checklist' },
];

export default function WorkspaceDashboard({ workspace }: Props) {
  const { activeRun, summary } = useVibeLoopContext();
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-primary-light tracking-tight">{workspace.projectName}</h2>
        <p className="text-body text-secondary-midGray mt-1">{workspace.objective}</p>
      </div>

      {/* Status row */}
      <div className="flex flex-wrap items-center gap-4">
        <ConnectionStatus workspace={workspace} />
        <RunControlBar workspace={workspace} run={activeRun} />
      </div>

      {/* Completion report (when run is done) */}
      {summary && <CompletionReport summary={summary} />}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-secondary-borderGray overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-small font-medium whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'text-accent-orange border-b-2 border-accent-orange'
                : 'text-secondary-midGray hover:text-primary-light'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {tab === 'overview' && (
          <div className="space-y-6">
            <WorkspaceKeyCard workspace={workspace} />
            {activeRun && (
              <div className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md p-4">
                <h4 className="text-small font-semibold text-primary-light uppercase tracking-wider mb-3">Active Run</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold text-primary-light">{activeRun.iteration}</p>
                    <p className="text-xs text-secondary-midGray">Iteration</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-accent-orange">{activeRun.stage.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-secondary-midGray">Stage</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-primary-light">{activeRun.unresolvedIssues.length}</p>
                    <p className="text-xs text-secondary-midGray">Issues</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'timeline' && activeRun && (
          <LiveTimeline runId={activeRun.id} events={activeRun.events} />
        )}

        {tab === 'prompt' && (
          <PromptViewer prompt={activeRun?.latestPrompt || ''} />
        )}

        {tab === 'response' && (
          <AgentResponseViewer response={activeRun?.latestResponse || null} />
        )}

        {tab === 'audit' && (
          <AuditSummaryPanel audit={activeRun?.latestAudit || null} />
        )}

        {tab === 'issues' && (
          <IssueTracker issues={activeRun?.unresolvedIssues || []} />
        )}

        {tab === 'checklist' && (
          <FeatureChecklistEditor workspace={workspace} />
        )}
      </div>
    </div>
  );
}
