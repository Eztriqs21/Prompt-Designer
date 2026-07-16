import type { AuditResult } from '../../types/vibeloop';
import { CheckCircle, AlertTriangle, XCircle, Ban } from 'lucide-react';

interface Props {
  audit: AuditResult | null;
}

const STATUS_CONFIG = {
  pass: { icon: CheckCircle, color: 'text-success-green', bg: 'bg-success-green/10', border: 'border-success-green/20' },
  pass_with_notes: { icon: AlertTriangle, color: 'text-warn-yellow', bg: 'bg-warn-yellow/10', border: 'border-warn-yellow/20' },
  needs_fix: { icon: XCircle, color: 'text-accent-orange', bg: 'bg-accent-orange/10', border: 'border-accent-orange/20' },
  blocked: { icon: Ban, color: 'text-semantic-dangerRed', bg: 'bg-semantic-dangerRed/10', border: 'border-semantic-dangerRed/20' },
};

export default function AuditSummaryPanel({ audit }: Props) {
  if (!audit) {
    return <p className="text-small text-secondary-midGray py-4">No audit results yet</p>;
  }

  const config = STATUS_CONFIG[audit.status];
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      <h4 className="text-small font-semibold text-primary-light uppercase tracking-wider">Audit Result</h4>

      {/* Status badge */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${config.bg} border ${config.border}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-small font-medium ${config.color}`}>
          {audit.status.replace(/_/g, ' ').toUpperCase()}
        </span>
      </div>

      {/* Summary */}
      <p className="text-small text-secondary-midGray leading-relaxed">{audit.summary}</p>

      {/* Issues */}
      {audit.issues.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-secondary-midGray uppercase mb-2">
            Issues ({audit.issues.length})
          </h5>
          <div className="space-y-2">
            {audit.issues.map((issue) => (
              <div key={issue.id} className="bg-primary-dark border border-secondary-borderGray rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    issue.severity === 'critical' ? 'bg-semantic-dangerRed/10 text-semantic-dangerRed' :
                    issue.severity === 'major' ? 'bg-accent-orange/10 text-accent-orange' :
                    issue.severity === 'minor' ? 'bg-warn-yellow/10 text-warn-yellow' :
                    'bg-secondary-darkSurface text-secondary-midGray'
                  }`}>
                    {issue.severity}
                  </span>
                  <span className="text-xs text-secondary-midGray">{issue.category}</span>
                  {issue.fixable && (
                    <span className="text-xs text-success-green">fixable</span>
                  )}
                </div>
                <p className="text-small text-primary-light">{issue.description}</p>
                {issue.suggestion && (
                  <p className="text-xs text-accent-orange mt-1">→ {issue.suggestion}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checklist Coverage */}
      {audit.checklistCoverage.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-secondary-midGray uppercase mb-2">Checklist Coverage</h5>
          <div className="space-y-1">
            {audit.checklistCoverage.map((c) => (
              <div key={c.itemId} className="flex items-center gap-2 text-xs">
                <span className={c.covered ? 'text-success-green' : 'text-secondary-midGray'}>
                  {c.covered ? '✓' : '○'}
                </span>
                <span className={c.covered ? 'text-primary-light' : 'text-secondary-midGray'}>
                  {c.itemId.slice(0, 8)}
                </span>
                <span className="text-secondary-midGray">{c.notes}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
