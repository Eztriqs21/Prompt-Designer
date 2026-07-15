import { memo, useState } from 'react';
import { ShieldCheck, RotateCcw, Lightbulb, AlertTriangle, Bug, Palette, Shield, Eye, Gauge, Copy, Check, FileText } from 'lucide-react';
import AuditFindingCard from './AuditFindingCard';
import type { AuditReport as AuditReportType, AuditFinding, Severity, FindingCategory } from '../../types';

interface AuditReportProps {
  report: AuditReportType;
  onReset: () => void;
}

const CATEGORY_CONFIG: Record<FindingCategory, { label: string; icon: typeof Bug; color: string }> = {
  bug: { label: 'Bugs', icon: Bug, color: 'text-accent-error' },
  loophole: { label: 'Loopholes', icon: AlertTriangle, color: 'text-accent-warning' },
  ux: { label: 'UI/UX Issues', icon: Palette, color: 'text-accent-info' },
  security: { label: 'Security Concerns', icon: Shield, color: 'text-accent-warning' },
  accessibility: { label: 'Accessibility Issues', icon: Eye, color: 'text-accent-info' },
  performance: { label: 'Performance Issues', icon: Gauge, color: 'text-accent-warning' },
  'code-quality': { label: 'Code Quality', icon: ShieldCheck, color: 'text-accent-success' },
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-accent-success';
  if (score >= 60) return 'text-accent-warning';
  if (score >= 40) return 'text-accent-warning';
  return 'text-accent-error';
}

function getScoreRing(score: number): string {
  if (score >= 80) return 'stroke-accent-success';
  if (score >= 60) return 'stroke-accent-warning';
  if (score >= 40) return 'stroke-accent-warning';
  return 'stroke-accent-error';
}

function groupByCategory(findings: AuditFinding[]): Map<FindingCategory, AuditFinding[]> {
  const groups = new Map<FindingCategory, AuditFinding[]>();
  for (const finding of findings) {
    const existing = groups.get(finding.category) || [];
    existing.push(finding);
    groups.set(finding.category, existing);
  }
  const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  for (const [, group] of groups) {
    group.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }
  return groups;
}

export default memo(function AuditReport({ report, onReset }: AuditReportProps) {
  const [fixPromptCopied, setFixPromptCopied] = useState(false);
  const [showFixPrompt, setShowFixPrompt] = useState(false);
  const grouped = groupByCategory(report.findings);
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference - (report.score / 100) * circumference;

  const handleCopyFixPrompt = async () => {
    try {
      await navigator.clipboard.writeText(report.fixPrompt);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = report.fixPrompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setFixPromptCopied(true);
    setTimeout(() => setFixPromptCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Score Header */}
      <div className="bg-surface-alt border border-border-soft rounded-md p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Score Circle */}
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" className="text-border-soft" strokeWidth="6" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                className={getScoreRing(report.score)}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-semibold ${getScoreColor(report.score)}`}>
                {report.score}
              </span>
              <span className="text-xs text-ink-muted">/100</span>
            </div>
          </div>

          {/* Summary */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-semibold text-ink-primary mb-1">
              Audit Report
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed">{report.summary}</p>
          </div>
        </div>

        {/* Severity Counts */}
        <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-border-soft">
          {(['critical', 'high', 'medium', 'low', 'info'] as Severity[]).map((sev) => {
            const count = report.severityCounts[sev] || 0;
            if (count === 0) return null;
            const colors: Record<Severity, string> = {
              critical: 'text-accent-error',
              high: 'text-accent-warning',
              medium: 'text-accent-warning',
              low: 'text-accent-info',
              info: 'text-ink-muted',
            };
            return (
              <span key={sev} className={`text-xs font-medium ${colors[sev]}`}>
                {count} {sev}
              </span>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="bg-surface-alt border border-border-soft rounded-md p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-accent-warning" />
            <h4 className="text-sm font-medium text-ink-primary">Recommendations</h4>
          </div>
          <ul className="space-y-2">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-ink-muted leading-relaxed">
                <span className="text-ink-muted/40 mt-0.5 shrink-0">{i + 1}.</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Findings by Category */}
      {Array.from(grouped.entries()).map(([category, findings]) => {
        const config = CATEGORY_CONFIG[category];
        const Icon = config.icon;
        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${config.color}`} />
              <h4 className="text-sm font-medium text-ink-primary">{config.label}</h4>
              <span className="text-xs text-ink-muted">({findings.length})</span>
            </div>
            <div className="space-y-2">
              {findings.map((finding) => (
                <AuditFindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Fix Prompt */}
      {report.fixPrompt && (
        <div className="bg-surface-alt border border-border-soft rounded-md overflow-hidden">
          <button
            onClick={() => setShowFixPrompt(!showFixPrompt)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-base transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent-info" />
              <h4 className="text-sm font-medium text-ink-primary">Detailed Fix Prompt</h4>
              <span className="text-xs text-ink-muted">-- ready to use with a coding agent</span>
            </div>
            <span className={`text-ink-muted transition-transform duration-200 ${showFixPrompt ? 'rotate-180' : ''}`}>
              v
            </span>
          </button>

          {showFixPrompt && (
            <div className="px-5 pb-5 border-t border-border-soft">
              <div className="flex items-center justify-between mt-4 mb-3">
                <span className="text-xs text-ink-muted">Copy this prompt and paste it into your coding agent</span>
                <button
                  onClick={handleCopyFixPrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-base border border-border-soft text-ink-muted hover:text-ink-primary text-xs font-medium transition-colors"
                >
                  {fixPromptCopied ? (
                    <>
                      <Check className="w-3 h-3 text-accent-success" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="font-mono text-xs text-ink-muted whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto p-4 bg-surface-base border border-border-soft rounded-md">
                {report.fixPrompt}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Reset Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-surface-alt border border-border-soft text-ink-muted hover:text-ink-primary text-sm font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Run Another Audit
        </button>
      </div>
    </div>
  );
});
