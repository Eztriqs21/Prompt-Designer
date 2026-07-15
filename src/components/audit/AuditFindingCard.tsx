import { memo } from 'react';
import { FileText, Wrench } from 'lucide-react';
import type { AuditFinding, Severity, FindingCategory } from '../../types';

interface AuditFindingCardProps {
  finding: AuditFinding;
}

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical', color: 'text-accent-error', bg: 'bg-accent-error/10', border: 'border-accent-error/20' },
  high: { label: 'High', color: 'text-accent-warning', bg: 'bg-accent-warning/10', border: 'border-accent-warning/20' },
  medium: { label: 'Medium', color: 'text-accent-warning', bg: 'bg-accent-warning/10', border: 'border-accent-warning/20' },
  low: { label: 'Low', color: 'text-accent-info', bg: 'bg-accent-info/10', border: 'border-accent-info/20' },
  info: { label: 'Info', color: 'text-ink-muted', bg: 'bg-surface-alt', border: 'border-border-soft' },
};

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  bug: 'Bug',
  loophole: 'Loophole',
  ux: 'UI/UX',
  security: 'Security',
  accessibility: 'Accessibility',
  performance: 'Performance',
  'code-quality': 'Code Quality',
};

export default memo(function AuditFindingCard({ finding }: AuditFindingCardProps) {
  const severity = SEVERITY_CONFIG[finding.severity];

  return (
    <div className="p-4 rounded-md bg-surface-alt border border-border-soft space-y-2.5">
      {/* Badges Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${severity.bg} ${severity.color} border ${severity.border}`}>
          {severity.label}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface-base border border-border-soft text-ink-muted">
          {CATEGORY_LABELS[finding.category]}
        </span>
        {finding.file && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-muted ml-auto">
            <FileText className="w-3 h-3" />
            {finding.file}{finding.line ? `:${finding.line}` : ''}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-ink-primary">{finding.title}</h4>

      {/* Description */}
      <p className="text-xs text-ink-muted leading-relaxed">{finding.description}</p>

      {/* Fix Suggestion */}
      {finding.fix && (
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-accent-success/5 border border-accent-success/10">
          <Wrench className="w-3.5 h-3.5 text-accent-success mt-0.5 shrink-0" />
          <p className="text-xs text-accent-success leading-relaxed">{finding.fix}</p>
        </div>
      )}

      {/* Confidence */}
      {finding.confidence < 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted/40">Confidence</span>
          <div className="flex-1 h-1 rounded-full bg-surface-base max-w-[80px]">
            <div
              className="h-full rounded-full bg-ink-muted/30"
              style={{ width: `${finding.confidence * 100}%` }}
            />
          </div>
          <span className="text-xs text-ink-muted/40">{Math.round(finding.confidence * 100)}%</span>
        </div>
      )}
    </div>
  );
});
