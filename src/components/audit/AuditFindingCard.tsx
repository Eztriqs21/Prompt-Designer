import { memo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Wrench } from 'lucide-react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import type { AuditFinding, Severity, FindingCategory } from '../../types';

interface AuditFindingCardProps {
  finding: AuditFinding;
  index: number;
}

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/20' },
  high: { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/20' },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/20' },
  low: { label: 'Low', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/20' },
  info: { label: 'Info', color: 'text-white/40', bg: 'bg-white/[0.06]', border: 'border-white/[0.08]' },
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

export default memo(function AuditFindingCard({ finding, index }: AuditFindingCardProps) {
  const reducedMotion = useReducedMotionSafe();
  const severity = SEVERITY_CONFIG[finding.severity];

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.25, delay: index * 0.03 }}
      className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2.5"
    >
      {/* Badges Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${severity.bg} ${severity.color} border ${severity.border}`}>
          {severity.label}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.04] text-white/40 border border-white/[0.06]">
          {CATEGORY_LABELS[finding.category]}
        </span>
        {finding.file && (
          <span className="inline-flex items-center gap-1 text-[10px] text-white/30 ml-auto">
            <FileText className="w-3 h-3" />
            {finding.file}{finding.line ? `:${finding.line}` : ''}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="text-[13px] font-medium text-white/80">{finding.title}</h4>

      {/* Description */}
      <p className="text-[12px] text-white/45 leading-relaxed">{finding.description}</p>

      {/* Fix Suggestion */}
      {finding.fix && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/[0.08]">
          <Wrench className="w-3.5 h-3.5 text-emerald-400/60 mt-0.5 shrink-0" />
          <p className="text-[11px] text-emerald-400/60 leading-relaxed">{finding.fix}</p>
        </div>
      )}

      {/* Confidence */}
      {finding.confidence < 1 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/25">Confidence</span>
          <div className="flex-1 h-1 rounded-full bg-white/[0.04] max-w-[80px]">
            <div
              className="h-full rounded-full bg-white/20"
              style={{ width: `${finding.confidence * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-white/25">{Math.round(finding.confidence * 100)}%</span>
        </div>
      )}
    </motion.div>
  );
});
