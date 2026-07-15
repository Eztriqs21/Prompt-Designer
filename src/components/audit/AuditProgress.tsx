import { memo } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, AlertCircle, Clock } from 'lucide-react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { fadeInUp, transitionEnter } from '../../motion/presets';
import type { AuditStatus, AuditJobStages } from '../../types';

interface AuditProgressProps {
  status: AuditStatus;
  progress: number;
  stages: AuditJobStages | null;
  error: string | null;
}

const STAGE_ORDER: Array<{ key: keyof AuditJobStages; label: string }> = [
  { key: 'ingesting', label: 'Ingesting input' },
  { key: 'analyzing', label: 'Analyzing code' },
  { key: 'testing', label: 'Browser testing' },
  { key: 'accessibility', label: 'Accessibility & performance' },
  { key: 'collecting', label: 'Collecting evidence' },
  { key: 'summarizing', label: 'Generating report' },
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

function StageIcon({ stageStatus }: { stageStatus: string }) {
  if (stageStatus === 'completed') {
    return <Check className="w-3.5 h-3.5 text-emerald-400" />;
  }
  if (stageStatus === 'running') {
    return <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />;
  }
  if (stageStatus === 'failed') {
    return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
  }
  return <Clock className="w-3.5 h-3.5 text-white/20" />;
}

export default memo(function AuditProgress({ status, progress, stages, error }: AuditProgressProps) {
  const reducedMotion = useReducedMotionSafe();

  return (
    <motion.div
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      variants={fadeInUp}
      transition={reducedMotion ? { duration: 0 } : transitionEnter}
      className="liquid-glass rounded-2xl p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/80">Audit Progress</h3>
        <span className="text-[12px] text-white/40">{Math.round(progress)}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Status Text */}
      <p className="text-[13px] text-white/50">
        {error || STATUS_TEXT[status] || 'Processing...'}
      </p>

      {/* Stage Timeline */}
      {stages && (
        <div className="space-y-1">
          {STAGE_ORDER.map(({ key, label }) => {
            const stageData = stages[key];
            if (!stageData || stageData.status === 'skipped') return null;

            return (
              <div
                key={key}
                className={`flex items-center gap-3 py-1.5 px-3 rounded-lg transition-colors duration-200 ${
                  stageData.status === 'running'
                    ? 'bg-white/[0.04]'
                    : stageData.status === 'completed'
                    ? 'opacity-60'
                    : ''
                }`}
              >
                <StageIcon stageStatus={stageData.status} />
                <span className={`text-[12px] ${
                  stageData.status === 'running'
                    ? 'text-white/70'
                    : stageData.status === 'completed'
                    ? 'text-white/40'
                    : stageData.status === 'failed'
                    ? 'text-red-400/60'
                    : 'text-white/25'
                }`}>
                  {label}
                </span>
                {stageData.status === 'completed' && stageData.completedAt && stageData.startedAt && (
                  <span className="ml-auto text-[10px] text-white/20">
                    {((stageData.completedAt - stageData.startedAt) / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
});
