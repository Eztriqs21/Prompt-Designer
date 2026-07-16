import type { CompletionSummary } from '../../types/vibeloop';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface Props {
  summary: CompletionSummary;
}

const STATUS_CONFIG = {
  complete: { icon: CheckCircle, color: 'text-success-green', label: 'Complete' },
  partial_complete: { icon: AlertTriangle, color: 'text-warn-yellow', label: 'Partial' },
  failed: { icon: XCircle, color: 'text-semantic-dangerRed', label: 'Failed' },
};

export default function CompletionReport({ summary }: Props) {
  const config = STATUS_CONFIG[summary.finalStatus];
  const Icon = config.icon;

  return (
    <div className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md p-5 space-y-5">
      <div className="flex items-center gap-3">
        <Icon className={`w-6 h-6 ${config.color}`} />
        <h3 className="text-body font-semibold text-primary-light">Final Report</h3>
        <span className={`text-small px-2 py-0.5 rounded ${config.color} bg-primary-dark`}>
          {config.label}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-primary-dark border border-secondary-borderGray rounded-md p-3 text-center">
          <p className="text-lg font-semibold text-primary-light">{summary.completedItems.length}/{summary.totalChecklistItems}</p>
          <p className="text-xs text-secondary-midGray">Items Done</p>
        </div>
        <div className="bg-primary-dark border border-secondary-borderGray rounded-md p-3 text-center">
          <p className="text-lg font-semibold text-primary-light">{summary.totalIterations}</p>
          <p className="text-xs text-secondary-midGray">Iterations</p>
        </div>
        <div className="bg-primary-dark border border-secondary-borderGray rounded-md p-3 text-center">
          <p className="text-lg font-semibold text-primary-light">{summary.duration}</p>
          <p className="text-xs text-secondary-midGray">Duration</p>
        </div>
      </div>

      {/* Completed items */}
      {summary.completedItems.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-success-green uppercase mb-2">Completed</h4>
          <div className="space-y-1">
            {summary.completedItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-small">
                <CheckCircle className="w-3 h-3 text-success-green" />
                <span className="text-primary-light">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unresolved issues */}
      {summary.unresolvedIssues.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-warn-yellow uppercase mb-2">
            Unresolved ({summary.unresolvedIssues.length})
          </h4>
          <div className="space-y-1">
            {summary.unresolvedIssues.map((issue) => (
              <div key={issue.id} className="flex items-start gap-2 text-small">
                <AlertTriangle className="w-3 h-3 text-warn-yellow mt-0.5 shrink-0" />
                <div>
                  <span className="text-primary-light">{issue.description}</span>
                  {issue.suggestion && (
                    <p className="text-xs text-accent-orange">→ {issue.suggestion}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-primary-dark border border-secondary-borderGray rounded-md p-3">
        <p className="text-small text-secondary-midGray leading-relaxed">{summary.notes}</p>
      </div>
    </div>
  );
}
