import { memo } from 'react';
import type { AuditStatus, AuditJobStages } from '../../types';

interface AuditProgressProps {
  status: AuditStatus;
  progress: number;
  stages: AuditJobStages | null;
  error: string | null;
}

const STAGE_ORDER: { key: keyof AuditJobStages; label: string; description: string }[] = [
  { key: 'ingesting', label: 'Ingesting', description: 'Ingest and validate the input source' },
  { key: 'analyzing', label: 'Analyzing', description: 'Statically analyze code for issues' },
  { key: 'testing', label: 'Testing', description: 'Run browser checks against rendered pages' },
  { key: 'accessibility', label: 'A11y & Perf', description: 'Evaluate accessibility and performance' },
  { key: 'collecting', label: 'Collecting', description: 'Capture evidence: screenshots, console, network' },
  { key: 'summarizing', label: 'Reporting', description: 'Generate the AI audit report' },
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

function StageDot({ status }: { status: string }) {
  if (status === 'completed') {
    return <span className="w-3 h-3 rounded-full bg-primary-light border border-secondary-borderGray" />;
  }
  if (status === 'running') {
    return (
      <span className="w-3 h-3 rounded-full border border-accent-blue flex items-center justify-center">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="w-3 h-3 rounded-full border border-semantic-dangerRed flex items-center justify-center">
        <span className="w-1.5 h-1.5 rounded-full bg-semantic-dangerRed" />
      </span>
    );
  }
  return <span className="w-3 h-3 rounded-full border border-secondary-midGray/30" />;
}

export default memo(function AuditProgress({ status, progress, stages, error }: AuditProgressProps) {
  return (
    <div className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-primary-light">Audit Progress</h3>
        <span className="text-xs text-secondary-midGray">{Math.round(progress)}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 rounded-full bg-secondary-darkSurface overflow-hidden">
        <div
          className="h-full rounded-full bg-accent-blue transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status Text */}
      <p className="text-sm text-secondary-midGray">{error || STATUS_TEXT[status] || 'Processing...'}</p>

      {/* Stage Stepper */}
      {stages && (
        <div className="flex flex-wrap gap-x-5 gap-y-3 pt-1">
          {STAGE_ORDER.map(({ key, label, description }) => {
            const stageData = stages[key];
            if (!stageData || stageData.status === 'skipped') return null;

            const dimmed = stageData.status === 'pending';
            const failed = stageData.status === 'failed';
            const running = stageData.status === 'running';

            return (
              <div key={key} className="flex flex-col items-center gap-1.5 text-center" title={description}>
                <StageDot status={stageData.status} />
                <span
                  className={`text-small ${
                    failed
                      ? 'text-semantic-dangerRed'
                      : dimmed
                        ? 'text-secondary-midGray/30'
                        : running
                          ? 'text-primary-light'
                          : 'text-secondary-midGray'
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
