import { memo } from 'react';
import { FileText, Wrench } from 'lucide-react';
import FadeIn from '../ui/FadeIn';
import type { AuditFinding, Severity, FindingCategory } from '../../types';

interface AuditFindingCardProps {
  finding: AuditFinding;
}

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical', color: 'text-semantic-dangerRed', bg: 'bg-semantic-dangerRed/10', border: 'border-semantic-dangerRed/20' },
  high: { label: 'High', color: 'text-semantic-dangerRed', bg: 'bg-semantic-dangerRed/10', border: 'border-semantic-dangerRed/20' },
  medium: { label: 'Medium', color: 'text-warn-yellow', bg: 'bg-warn-yellow/10', border: 'border-warn-yellow/20' },
  low: { label: 'Low', color: 'text-success-green', bg: 'bg-success-green/10', border: 'border-success-green/20' },
  info: { label: 'Info', color: 'text-secondary-midGray', bg: 'bg-secondary-darkSurface', border: 'border-secondary-borderGray' },
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
    <FadeIn className="p-4 rounded-md bg-secondary-darkSurface border border-secondary-borderGray space-y-2.5">
      {/* Badges Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${severity.bg} ${severity.color} border ${severity.border}`}>
          {severity.label}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary-dark border border-secondary-borderGray text-secondary-midGray">
          {CATEGORY_LABELS[finding.category]}
        </span>
        {finding.file && (
          <span className="inline-flex items-center gap-1 text-xs text-secondary-midGray ml-auto">
            <FileText className="w-3 h-3" />
            {finding.file}{finding.line ? `:${finding.line}` : ''}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-primary-light">{finding.title}</h4>

      {/* Description */}
      <p className="text-xs text-secondary-midGray leading-relaxed">{finding.description}</p>

      {/* Fix Suggestion */}
      {finding.fix && (
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-accent-orange/5 border border-accent-orange/10">
          <Wrench className="w-3.5 h-3.5 text-accent-orange mt-0.5 shrink-0" />
          <p className="text-xs text-accent-orange leading-relaxed">{finding.fix}</p>
        </div>
      )}

      {/* Evidence reference */}
      {finding.evidence && (
        <p className="text-xs text-secondary-midGray/70 font-mono truncate">
          Evidence: {finding.evidence}
        </p>
      )}

      {/* Confidence */}
      {finding.confidence < 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary-midGray/40">Confidence</span>
          <div className="flex-1 h-1 rounded-full bg-primary-dark max-w-[80px]">
            <div
              className="h-full rounded-full bg-secondary-midGray/30"
              style={{ width: `${finding.confidence * 100}%` }}
            />
          </div>
          <span className="text-xs text-secondary-midGray/40">{Math.round(finding.confidence * 100)}%</span>
        </div>
      )}
    </FadeIn>
  );
});
