import { useState, useCallback } from 'react';
import { ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { useAudit } from '../hooks/useAudit';
import AuditInput from '../components/audit/AuditInput';
import AuditModeSelector from '../components/audit/AuditModeSelector';
import AuditComparisonTable from '../components/audit/AuditComparisonTable';
import AuditProgress from '../components/audit/AuditProgress';
import AuditReport from '../components/audit/AuditReport';
import type { AuditInputType, AuditMode } from '../types';

export default function AuditPage() {
  const audit = useAudit();

  const [inputType, setInputType] = useState<AuditInputType>('url');
  const [source, setSource] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<AuditMode>('recommended');

  const canStart = audit.status === null || audit.status === 'complete' || audit.status === 'failed';

  const handleStart = useCallback(() => {
    if (!canStart) return;
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
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-accent-warning" />
            <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">Website AUDIT</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-ink-primary tracking-tight mb-2">
            Website Audit
          </h1>

          <p className="text-sm text-ink-muted max-w-2xl mx-auto leading-relaxed">
            Analyze websites for code issues, bugs, UX problems, and performance concerns.
            Get a professional QA-style report.
          </p>
        </div>

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
          <div className="space-y-8">
            {/* Input Section */}
            <AuditInput
              inputType={inputType}
              source={source}
              files={files}
              onInputTypeChange={setInputType}
              onSourceChange={setSource}
              onFilesChange={setFiles}
              disabled={isRunning}
            />

            {/* Mode Selector */}
            <div>
              <label className="block text-xs text-ink-muted mb-3 uppercase tracking-wider font-medium">
                Audit Depth
              </label>
              <AuditModeSelector value={mode} onChange={setMode} disabled={isRunning} />
            </div>

            {/* Error Display */}
            {audit.error && (
              <div className="flex items-center gap-3 p-4 rounded-md bg-accent-error/10 border border-accent-error/20">
                <AlertTriangle className="w-4 h-4 text-accent-error shrink-0" />
                <p className="text-sm text-accent-error">{audit.error}</p>
              </div>
            )}

            {/* Start Button */}
            <div>
              <button
                onClick={handleStart}
                disabled={
                  !canStart ||
                  audit.isSubmitting ||
                  ((inputType === 'url' || inputType === 'github') && !source.trim()) ||
                  (inputType === 'files' && files.length === 0)
                }
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-md bg-accent-primary text-surface-base font-medium text-sm hover:bg-accent-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
              <p className="mt-2 text-xs text-ink-muted text-center">
                {mode === 'basic' && 'Basic: Code-only analysis, fastest option'}
                {mode === 'recommended' && 'Recommended: Code + light browser testing, best balance'}
                {mode === 'full' && 'Full: Complete testing with accessibility & performance checks'}
              </p>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        {!hasReport && (
          <div className="mt-12">
            <AuditComparisonTable />
          </div>
        )}
      </div>
    </div>
  );
}
