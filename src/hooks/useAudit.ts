import { useState, useRef, useCallback, useEffect } from 'react';
import {
  createAuditJob,
  getAuditJob,
  getAuditReport,
} from '../lib/apiClient';
import type {
  AuditInputType,
  AuditMode,
  AuditStatus,
  AuditReport,
  AuditJobStages,
  Severity,
} from '../types';

const POLL_INTERVAL = 2000;

// Build a best-effort report from whatever the pipeline collected before it
// failed, so partial results are never hidden behind a bare error.
function buildPartialReport(job: any): AuditReport {
  const findings: any[] = job.findings ?? [];
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  } as Record<Severity, number>;
  for (const f of findings) {
    if (f?.severity in severityCounts) {
      severityCounts[f.severity as Severity]++;
    }
  }
  return {
    summary:
      'Partial audit results — the report stage did not complete, so findings may be incomplete.',
    score: 0,
    severityCounts,
    findings,
    codeIssues: [],
    browserIssues: [],
    accessibilityIssues: [],
    performanceIssues: [],
    recommendations: [],
    evidence: job.evidence ?? [],
    fixPrompt: '',
  };
}

interface UseAuditReturn {
  jobId: string | null;
  status: AuditStatus | null;
  progress: number;
  stages: AuditJobStages | null;
  report: AuditReport | null;
  reportMeta: { inputType: AuditInputType; source: string; mode: AuditMode } | null;
  error: string | null;
  hasPartialData: boolean;
  isSubmitting: boolean;
  startAudit: (data: {
    inputType: AuditInputType;
    source: string;
    mode: AuditMode;
    files?: File[];
  }) => Promise<void>;
  reset: () => void;
  stopPolling: () => void;
}

export function useAudit(): UseAuditReturn {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<AuditStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [stages, setStages] = useState<AuditJobStages | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [reportMeta, setReportMeta] = useState<{ inputType: AuditInputType; source: string; mode: AuditMode } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPartialData, setHasPartialData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generatingRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollJob = useCallback((id: string) => {
    stopPolling();

    pollRef.current = setInterval(async () => {
      try {
        const job = await getAuditJob(id);
        setStatus(job.status);
        setProgress(job.progress);
        setStages(job.stages);

        if (job.status === 'complete') {
          stopPolling();
          // Fetch the full report
          try {
            const reportData = await getAuditReport(id);
            setReport(reportData.report);
            setReportMeta({
              inputType: reportData.inputType,
              source: reportData.source,
              mode: reportData.mode,
            });
          } catch (err: any) {
            setError(err.message || 'Failed to load report');
          }
        } else if (job.status === 'failed') {
          stopPolling();
          // Even on failure, the pipeline preserves findings/evidence server-side.
          // Surface them as partial results instead of hiding everything.
          const partialReport =
            job.report ?? (job.findings && job.findings.length > 0 ? buildPartialReport(job) : null);
          if (job.partial && partialReport) {
            setReport(partialReport);
            setReportMeta({
              inputType: job.inputType,
              source: job.source,
              mode: job.mode,
            });
            setHasPartialData(true);
            if (job.error) setError(job.error);
          } else {
            setError(job.error || 'Audit failed unexpectedly');
          }
        }
      } catch (err: any) {
        stopPolling();
        setError(err.message || 'Failed to poll audit status');
      }
    }, POLL_INTERVAL);
  }, [stopPolling]);

  const startAudit = useCallback(async (data: {
    inputType: AuditInputType;
    source: string;
    mode: AuditMode;
    files?: File[];
  }) => {
    if (generatingRef.current) return;
    generatingRef.current = true;

    try {
      setIsSubmitting(true);
      setError(null);
      setReport(null);
      setReportMeta(null);

      const result = await createAuditJob(data);
      setJobId(result.id);
      setStatus(result.status as AuditStatus);
      setProgress(result.progress);
      setIsSubmitting(false);

      // Start polling
      pollJob(result.id);
    } catch (err: any) {
      setError(err.message || 'Failed to start audit');
      setIsSubmitting(false);
    } finally {
      generatingRef.current = false;
    }
  }, [pollJob]);

  const reset = useCallback(() => {
    stopPolling();
    setJobId(null);
    setStatus(null);
    setProgress(0);
    setStages(null);
    setReport(null);
    setReportMeta(null);
    setError(null);
    setHasPartialData(false);
    setIsSubmitting(false);
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    jobId,
    status,
    progress,
    stages,
    report,
    reportMeta,
    error,
    hasPartialData,
    isSubmitting,
    startAudit,
    reset,
    stopPolling,
  };
}
