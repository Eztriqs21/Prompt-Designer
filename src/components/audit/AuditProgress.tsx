import { memo } from 'react';
import { Check, Loader2, AlertCircle, Clock } from 'lucide-react';
import type { AuditStatus, AuditJobStages } from '../../types';

interface AuditProgressProps {
  status: AuditStatus;
  progress: number;
  stages: AuditJobStages | null;
  error: string | null;
}

const STAGE_ORDER: Array<{ key: keyof AuditJobStages; label: string }> = [
  { key: 'ingesting', label: 'Ingesting input' },
  { key: 'analyzing', label: 'Analyzing code' },
  { key: 'testing', label: 'Browser testing' },
  { key: 'accessibility', label: 'Accessibility & performance' },
  { key: 'collecting', label: 'Collecting evidence' },
  { key: 'summarizing', label: 'Generating report' },
];

const STATUS_TEXT: Record<string, string> = {
  queued: 'Queued...',
  ingesting: 'Preparing your input...',
  analyzing: 'Analyzing code for issues...',
  testing: 'Running browser checks...',
  accessibility: 'Checking accessibility & performance...',
  collecting: 'Gathering evidence...',
  summarizing: 'Generating AI report...',
  complete: 'Audit complete!',
  failed: 'Audit failed',
};

function StageIcon({ stageStatus }: { stageStatus: string }) {
  if (stageStatus === 'completed') {
    return <Check className="w-3.5 h-3.5 text-accent-success" />;
  }
  if (stageStatus === 'running') {
    return <Loader2 className="w-3.5 h-3.5 text-accent-info animate-spin" />;
  }
  if (stageStatus === 'failed') {
    return <AlertCircle className="w-3.5 h-3.5 text-accent-error" />;
  }
  return <Clock className="w-3.5 h-3.5 text-ink-muted/30" />;
}

export default memo(function AuditProgress({ status, progress, stages, error }: AuditProgressProps) {
  return (
    <div className="bg-surface-alt border border-border-soft rounded-md p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink-primary">Audit Progress</h3>
        <span className="text-xs text-ink-muted">{Math.round(progress)}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 rounded-full bg-surface-base overflow-hidden">
        <div
          className="h-full rounded-full bg-ink-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status Text */}
      <p className="text-sm text-ink-muted">
        {error || STATUS_TEXT[status] || 'Processing...'}
      </p>

      {/* Stage Timeline */}
      {stages && (
        <div className="space-y-1">
          {STAGE_ORDER.map(({ key, label }) => {
            const stageData = stages[key];
            if (!stageData || stageData.status === 'skipped') return null;

            return (
              <div
                key={key}
                className={`flex items-center gap-3 py-1.5 px-3 rounded-md transition-colors duration-150 ${
                  stageData.status === 'running'
                    ? 'bg-surface-base'
                    : stageData.status === 'completed'
                    ? 'opacity-60'
                    : ''
                }`}
              >
                <StageIcon stageStatus={stageData.status} />
                <span className={`text-xs ${
                  stageData.status === 'running'
                    ? 'text-ink-primary'
                    : stageData.status === 'completed'
                    ? 'text-ink-muted'
                    : stageData.status === 'failed'
                    ? 'text-accent-error'
                    : 'text-ink-muted/40'
                }`}>
                  {label}
                </span>
                {stageData.status === 'completed' && stageData.completedAt && stageData.startedAt && (
                  <span className="ml-auto text-xs text-ink-muted/40">
                    {((stageData.completedAt - stageData.startedAt) / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
