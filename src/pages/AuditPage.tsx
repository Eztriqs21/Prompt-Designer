import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { useReducedMotionSafe } from '../hooks/useReducedMotionSafe';
import { useAudit } from '../hooks/useAudit';
import { fadeInUp, staggerContainer, transitionEnter } from '../motion/presets';
import AuditInput from '../components/audit/AuditInput';
import AuditModeSelector from '../components/audit/AuditModeSelector';
import AuditComparisonTable from '../components/audit/AuditComparisonTable';
import AuditProgress from '../components/audit/AuditProgress';
import AuditReport from '../components/audit/AuditReport';
import type { AuditInputType, AuditMode } from '../types';

export default function AuditPage() {
  const reducedMotion = useReducedMotionSafe();
  const audit = useAudit();

  const [inputType, setInputType] = useState<AuditInputType>('url');
  const [source, setSource] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<AuditMode>('recommended');

  const canStart = audit.status === null || audit.status === 'complete' || audit.status === 'failed';

  const handleStart = useCallback(() => {
    if (!canStart) return;

    // Validate input
    if ((inputType === 'url' || inputType === 'github') && !source.trim()) return;

    audit.startAudit({
      inputType,
      source: source.trim(),
      mode,
      files: files.length > 0 ? files : undefined,
    });
  }, [canStart, inputType, source, mode, files, audit]);

  const handleReset = useCallback(() => {
    audit.reset();
    setInputType('url');
    setSource('');
    setFiles([]);
    setMode('recommended');
  }, [audit]);

  const isRunning = audit.status !== null && audit.status !== 'complete' && audit.status !== 'failed';
  const hasReport = audit.report !== null;

  return (
    <motion.div
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      variants={fadeInUp}
      transition={reducedMotion ? { duration: 0 } : transitionEnter}
      className="min-h-screen bg-black text-white relative overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-20">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Prompt Designer
        </Link>

        {/* Header */}
        <motion.div
          variants={staggerContainer}
          {...(reducedMotion ? {} : { initial: 'hidden', animate: 'visible' })}
          className="text-center mb-10"
        >
          <motion.div
            variants={fadeInUp}
            transition={reducedMotion ? { duration: 0 } : transitionEnter}
            className="inline-flex items-center gap-2 mb-3"
          >
            <ShieldCheck className="w-5 h-5 text-indigo-400/60" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-white/30">Website AUDIT</span>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            transition={reducedMotion ? { duration: 0 } : transitionEnter}
            className="text-3xl md:text-4xl text-white tracking-tight mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Website Audit
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            transition={reducedMotion ? { duration: 0 } : transitionEnter}
            className="text-sm text-white/50 max-w-md mx-auto"
          >
            Analyze websites for code issues, bugs, UX problems, and performance concerns.
            Get a professional QA-style report.
          </motion.p>
        </motion.div>

        {/* Main Content */}
        {hasReport && audit.report ? (
          <AuditReport report={audit.report} onReset={handleReset} />
        ) : isRunning ? (
          <AuditProgress
            status={audit.status!}
            progress={audit.progress}
            stages={audit.stages}
            error={audit.error}
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            {...(reducedMotion ? {} : { initial: 'hidden', animate: 'visible' })}
            className="space-y-8"
          >
            {/* Input Section */}
            <motion.div variants={fadeInUp} transition={reducedMotion ? { duration: 0 } : transitionEnter}>
              <AuditInput
                inputType={inputType}
                source={source}
                files={files}
                onInputTypeChange={setInputType}
                onSourceChange={setSource}
                onFilesChange={setFiles}
                disabled={isRunning}
              />
            </motion.div>

            {/* Mode Selector */}
            <motion.div variants={fadeInUp} transition={reducedMotion ? { duration: 0 } : transitionEnter}>
              <label className="block text-[12px] text-white/40 mb-3 uppercase tracking-wider font-medium">
                Audit Depth
              </label>
              <AuditModeSelector value={mode} onChange={setMode} disabled={isRunning} />
            </motion.div>

            {/* Error Display */}
            {audit.error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-red-500/[0.06] border border-red-500/20"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-[13px] text-red-400/80">{audit.error}</p>
              </motion.div>
            )}

            {/* Start Button */}
            <motion.div variants={fadeInUp} transition={reducedMotion ? { duration: 0 } : transitionEnter}>
              <button
                onClick={handleStart}
                disabled={
                  !canStart ||
                  audit.isSubmitting ||
                  ((inputType === 'url' || inputType === 'github') && !source.trim()) ||
                  (inputType === 'files' && files.length === 0)
                }
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white text-black font-medium text-[14px] hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
              >
                {audit.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting audit...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Start Audit
                  </>
                )}
              </button>
              <p className="mt-2 text-[10px] text-white/20 text-center">
                {mode === 'basic' && 'Basic: Code-only analysis, fastest option'}
                {mode === 'recommended' && 'Recommended: Code + light browser testing, best balance'}
                {mode === 'full' && 'Full: Complete testing with accessibility & performance checks'}
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* Comparison Table — always visible at bottom */}
        {!hasReport && (
          <motion.div
            variants={fadeInUp}
            transition={reducedMotion ? { duration: 0 } : transitionEnter}
            initial={reducedMotion ? false : 'hidden'}
            animate="visible"
            className="mt-12"
          >
            <AuditComparisonTable />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
