import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, RotateCcw, Lightbulb, AlertTriangle, Bug, Palette, Shield, Eye, Gauge, Copy, Check, FileText } from 'lucide-react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { fadeInUp, staggerContainer, transitionEnter } from '../../motion/presets';
import AuditFindingCard from './AuditFindingCard';
import type { AuditReport as AuditReportType, AuditFinding, Severity, FindingCategory } from '../../types';

interface AuditReportProps {
  report: AuditReportType;
  onReset: () => void;
}

const CATEGORY_CONFIG: Record<FindingCategory, { label: string; icon: typeof Bug; color: string }> = {
  bug: { label: 'Bugs', icon: Bug, color: 'text-red-400' },
  loophole: { label: 'Loopholes', icon: AlertTriangle, color: 'text-orange-400' },
  ux: { label: 'UI/UX Issues', icon: Palette, color: 'text-violet-400' },
  security: { label: 'Security Concerns', icon: Shield, color: 'text-amber-400' },
  accessibility: { label: 'Accessibility Issues', icon: Eye, color: 'text-cyan-400' },
  performance: { label: 'Performance Issues', icon: Gauge, color: 'text-pink-400' },
  'code-quality': { label: 'Code Quality', icon: ShieldCheck, color: 'text-emerald-400' },
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreRing(score: number): string {
  if (score >= 80) return 'stroke-emerald-400';
  if (score >= 60) return 'stroke-yellow-400';
  if (score >= 40) return 'stroke-orange-400';
  return 'stroke-red-400';
}

function groupByCategory(findings: AuditFinding[]): Map<FindingCategory, AuditFinding[]> {
  const groups = new Map<FindingCategory, AuditFinding[]>();
  for (const finding of findings) {
    const existing = groups.get(finding.category) || [];
    existing.push(finding);
    groups.set(finding.category, existing);
  }
  // Sort by severity within each group
  const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  for (const [, group] of groups) {
    group.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }
  return groups;
}

export default memo(function AuditReport({ report, onReset }: AuditReportProps) {
  const reducedMotion = useReducedMotionSafe();
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
    <motion.div
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      variants={fadeInUp}
      transition={reducedMotion ? { duration: 0 } : transitionEnter}
      className="space-y-6"
    >
      {/* Score Header */}
      <div className="liquid-glass rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Score Circle */}
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                className={getScoreRing(report.score)}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={reducedMotion ? { duration: 0 } : { duration: 1, ease: 'easeOut', delay: 0.3 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-semibold ${getScoreColor(report.score)}`}>
                {report.score}
              </span>
              <span className="text-[10px] text-white/30">/100</span>
            </div>
          </div>

          {/* Summary */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-medium text-white/90 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Audit Report
            </h3>
            <p className="text-[13px] text-white/50 leading-relaxed">{report.summary}</p>
          </div>
        </div>

        {/* Severity Counts */}
        <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-white/[0.06]">
          {(['critical', 'high', 'medium', 'low', 'info'] as Severity[]).map((sev) => {
            const count = report.severityCounts[sev] || 0;
            if (count === 0) return null;
            const colors: Record<Severity, string> = {
              critical: 'text-red-400',
              high: 'text-orange-400',
              medium: 'text-yellow-400',
              low: 'text-blue-400',
              info: 'text-white/40',
            };
            return (
              <span key={sev} className={`text-[12px] font-medium ${colors[sev]}`}>
                {count} {sev}
              </span>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="liquid-glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400/60" />
            <h4 className="text-[13px] font-medium text-white/70">Recommendations</h4>
          </div>
          <ul className="space-y-2">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-white/45 leading-relaxed">
                <span className="text-white/20 mt-0.5 shrink-0">{i + 1}.</span>
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
          <motion.div
            key={category}
            variants={staggerContainer}
            {...(reducedMotion ? {} : { initial: 'hidden', animate: 'visible' })}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${config.color}`} />
              <h4 className="text-[13px] font-medium text-white/70">{config.label}</h4>
              <span className="text-[11px] text-white/30">({findings.length})</span>
            </div>
            <div className="space-y-2">
              {findings.map((finding, index) => (
                <AuditFindingCard key={finding.id} finding={finding} index={index} />
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* Fix Prompt */}
      {report.fixPrompt && (
        <div className="liquid-glass rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowFixPrompt(!showFixPrompt)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400/60" />
              <h4 className="text-[13px] font-medium text-white/70">Detailed Fix Prompt</h4>
              <span className="text-[10px] text-white/30">— ready to use with a coding agent</span>
            </div>
            <motion.span
              animate={{ rotate: showFixPrompt ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-white/30"
            >
              ▼
            </motion.span>
          </button>

          {showFixPrompt && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-5 pb-5 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mt-4 mb-3">
                  <span className="text-[11px] text-white/30">Copy this prompt and paste it into your coding agent</span>
                  <button
                    onClick={handleCopyFixPrompt}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1] text-[11px] font-medium transition-all duration-200"
                  >
                    {fixPromptCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
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
                <pre className="font-mono text-[11px] text-white/50 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto p-4 bg-black/30 rounded-xl border border-white/[0.05]">
                  {report.fixPrompt}
                </pre>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Reset Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1] text-[13px] font-medium transition-all duration-200"
        >
          <RotateCcw className="w-4 h-4" />
          Run Another Audit
        </button>
      </div>
    </motion.div>
  );
});
