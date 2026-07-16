import { memo, useState } from 'react';
import { RotateCcw, Copy, Check, Images } from 'lucide-react';
import { motion } from 'framer-motion';
import Card from '../ui/Card';
import Button from '../ui/Button';
import AuditFindingCard from './AuditFindingCard';
import EvidenceViewer from './EvidenceViewer';
import FadeIn from '../ui/FadeIn';
import type { AuditReport as AuditReportType, AuditFinding, Severity, FindingCategory } from '../../types';

interface AuditReportProps {
  report: AuditReportType;
  onReset: () => void;
}

const SECTION_INTROS: Record<string, string> = {
  code: 'Static analysis findings from source inspection.',
  browser: 'Issues observed during live browser testing.',
  accessibility: 'WCAG and usability barriers detected in rendered pages.',
  performance: 'Load and runtime performance concerns.',
  security: 'Security weaknesses and logic loopholes.',
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-success-green';
  if (score >= 60) return 'text-accent-orange';
  if (score >= 40) return 'text-warn-yellow';
  return 'text-semantic-dangerRed';
}

function getScoreRing(score: number): string {
  if (score >= 80) return 'stroke-success-green';
  if (score >= 60) return 'stroke-accent-orange';
  if (score >= 40) return 'stroke-warn-yellow';
  return 'stroke-semantic-dangerRed';
}

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

function groupByCategory(findings: AuditFinding[]): Map<FindingCategory, AuditFinding[]> {
  const groups = new Map<FindingCategory, AuditFinding[]>();
  for (const finding of findings) {
    const existing = groups.get(finding.category) || [];
    existing.push(finding);
    groups.set(finding.category, existing);
  }
  for (const [, group] of groups) {
    group.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }
  return groups;
}

function buildSections(report: AuditReportType): { key: string; title: string; intro: string; items: AuditFinding[] }[] {
  const codeItems = report.codeIssues ?? [];
  const browserItems = report.browserIssues ?? [];
  const a11yItems = report.accessibilityIssues ?? [];
  const perfItems = report.performanceIssues ?? [];
  const secItems = report.findings.filter((f) => f.category === 'security' || f.category === 'loophole');

  if (codeItems.length || browserItems.length || a11yItems.length || perfItems.length) {
    return [
      { key: 'code', title: 'Code Issues', intro: SECTION_INTROS.code, items: codeItems },
      { key: 'browser', title: 'Browser Issues', intro: SECTION_INTROS.browser, items: browserItems },
      { key: 'accessibility', title: 'Accessibility', intro: SECTION_INTROS.accessibility, items: a11yItems },
      { key: 'performance', title: 'Performance', intro: SECTION_INTROS.performance, items: perfItems },
      { key: 'security', title: 'Security / Loopholes', intro: SECTION_INTROS.security, items: secItems },
    ].filter((s) => s.items.length > 0);
  }

  // Fallback: group `findings` by category into the same sections.
  const groups = groupByCategory(report.findings);
  const sectionKeys: { key: string; title: string; cats: FindingCategory[] }[] = [
    { key: 'code', title: 'Code Issues', cats: ['bug', 'code-quality'] },
    { key: 'browser', title: 'Browser Issues', cats: ['ux'] },
    { key: 'accessibility', title: 'Accessibility', cats: ['accessibility'] },
    { key: 'performance', title: 'Performance', cats: ['performance'] },
    { key: 'security', title: 'Security / Loopholes', cats: ['security', 'loophole'] },
  ];
  return sectionKeys
    .map(({ key, title, cats }) => ({
      key,
      title,
      intro: SECTION_INTROS[key],
      items: cats.flatMap((c) => groups.get(c) ?? []),
    }))
    .filter((s) => s.items.length > 0);
}

export default memo(function AuditReport({ report, onReset }: AuditReportProps) {
  const [fixPromptCopied, setFixPromptCopied] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference - (report.score / 100) * circumference;

  const critical = report.severityCounts?.critical ?? 0;
  const total = report.findings.length;
  const sections = buildSections(report);
  const codeCount = sections.find((s) => s.key === 'code')?.items.length ?? 0;
  const browserCount = sections.find((s) => s.key === 'browser')?.items.length ?? 0;

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
      {/* Score Header + Key Metrics */}
      <div className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Score Circle */}
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" className="text-secondary-borderGray" strokeWidth="6" />
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
              <span className={`text-2xl font-semibold ${getScoreColor(report.score)}`}>{report.score}</span>
              <span className="text-xs text-secondary-midGray">/100</span>
            </div>
          </div>

          {/* Summary */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-heading text-primary-light mb-1">Audit Report</h3>
            <p className="text-body text-secondary-midGray leading-relaxed">{report.summary}</p>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-secondary-borderGray">
          <div className="bg-primary-dark border border-secondary-borderGray rounded-md p-4">
            <div className="text-2xl font-semibold text-primary-light">{critical}</div>
            <div className="text-small text-secondary-midGray mt-1">Critical issues</div>
          </div>
          <div className="bg-primary-dark border border-secondary-borderGray rounded-md p-4">
            <div className="text-2xl font-semibold text-primary-light">{total}</div>
            <div className="text-small text-secondary-midGray mt-1">Total findings</div>
          </div>
          <div className="bg-primary-dark border border-secondary-borderGray rounded-md p-4">
            <div className="text-2xl font-semibold text-primary-light">
              {codeCount} : {browserCount}
            </div>
            <div className="text-small text-secondary-midGray mt-1">Code vs browser ratio</div>
          </div>
        </div>
      </div>

      {/* Evidence */}
      {report.evidence.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-secondary-darkSurface border border-secondary-borderGray rounded-md px-4 py-3">
          <div>
            <div className="flex items-center gap-2 text-body text-primary-light">
              <Images className="w-4 h-4 text-accent-orange" />
              Captured evidence
            </div>
            <p className="text-small text-secondary-midGray mt-0.5">
              {report.evidence.length} item(s): screenshots, console logs, and snapshots.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowEvidence(true)}>
            View evidence
          </Button>
        </div>
      )}

      <EvidenceViewer open={showEvidence} evidence={report.evidence} onClose={() => setShowEvidence(false)} />

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <Card title="Recommendations">
          <ul className="space-y-2">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-small text-secondary-midGray leading-relaxed">
                <span className="text-secondary-midGray/40 mt-0.5 shrink-0">{i + 1}.</span>
                {rec}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Findings by Section */}
      {sections.map((section, si) => (
        <FadeIn key={section.key} delay={Math.min(si * 0.06, 0.3)} className="space-y-3">
          <div>
            <h4 className="text-subheading text-primary-light">{section.title}</h4>
            <p className="text-small text-secondary-midGray mt-1">{section.intro}</p>
          </div>
          <div className="space-y-2">
            {section.items.map((finding, fi) => (
              <FadeIn key={finding.id} delay={Math.min(fi * 0.04, 0.3)}>
                <AuditFindingCard finding={finding} />
              </FadeIn>
            ))}
          </div>
        </FadeIn>
      ))}

      {/* Fix Prompt */}
      {report.fixPrompt && (
        <FadeIn delay={0.1}>
          <Card title="Prompt for Coding Agent">
            <motion.pre
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="font-mono text-small text-secondary-midGray whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto p-4 bg-primary-dark border border-secondary-borderGray rounded-md"
            >
              {report.fixPrompt}
            </motion.pre>
            <div className="flex items-center justify-between gap-3 mt-3">
              <p className="text-small text-secondary-midGray">
                Optimized for coding agents like Claude Code / OpenCode-style tools.
              </p>
              <Button variant="secondary" size="sm" onClick={handleCopyFixPrompt}>
                {fixPromptCopied ? (
                  <>
                    <Check className="w-3 h-3 text-success-green" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy for agent
                  </>
                )}
              </Button>
            </div>
          </Card>
        </FadeIn>
      )}

      {/* Reset Button */}
      <div className="flex justify-center pt-4">
        <Button variant="secondary" size="md" onClick={onReset}>
          <RotateCcw className="w-4 h-4" />
          Run Another Audit
        </Button>
      </div>
    </div>
  );
});
