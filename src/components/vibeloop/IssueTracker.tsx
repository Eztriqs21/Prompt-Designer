import type { Issue } from '../../types/vibeloop';
import { AlertTriangle, Info, AlertCircle, XCircle } from 'lucide-react';

interface Props {
  issues: Issue[];
}

const SEVERITY_CONFIG = {
  critical: { icon: XCircle, color: 'text-semantic-dangerRed', bg: 'bg-semantic-dangerRed/5' },
  major: { icon: AlertCircle, color: 'text-accent-orange', bg: 'bg-accent-orange/5' },
  minor: { icon: AlertTriangle, color: 'text-warn-yellow', bg: 'bg-warn-yellow/5' },
  info: { icon: Info, color: 'text-secondary-midGray', bg: 'bg-secondary-darkSurface' },
};

export default function IssueTracker({ issues }: Props) {
  if (issues.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-small text-success-green">No unresolved issues</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-small font-semibold text-primary-light uppercase tracking-wider">
        Unresolved Issues ({issues.length})
      </h4>
      {issues.map((issue) => {
        const config = SEVERITY_CONFIG[issue.severity];
        const Icon = config.icon;
        return (
          <div key={issue.id} className={`${config.bg} border border-secondary-borderGray rounded-md p-3`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-3.5 h-3.5 ${config.color}`} />
              <span className={`text-xs font-medium ${config.color}`}>{issue.severity.toUpperCase()}</span>
              <span className="text-xs text-secondary-midGray">{issue.category}</span>
              {issue.fixable && (
                <span className="text-xs text-success-green border border-success-green/20 px-1 rounded">fixable</span>
              )}
            </div>
            <p className="text-small text-primary-light">{issue.description}</p>
            {issue.suggestion && (
              <p className="text-xs text-accent-orange mt-1">→ {issue.suggestion}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
