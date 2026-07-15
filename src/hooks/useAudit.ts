import { useState, useRef, useCallback, useEffect } from 'react';
import {
  createAuditJob,
  getAuditJob,
  getAuditReport,
} from '../lib/apiClient';
import type { AuditInputType, AuditMode, AuditStatus, AuditReport, AuditJobStages } from '../types';

const POLL_INTERVAL = 2000;

interface UseAuditReturn {
  jobId: string | null;
  status: AuditStatus | null;
  progress: number;
  stages: AuditJobStages | null;
  report: AuditReport | null;
  reportMeta: { inputType: AuditInputType; source: string; mode: AuditMode } | null;
  error: string | null;
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
          setError(job.error || 'Audit failed unexpectedly');
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
    isSubmitting,
    startAudit,
    reset,
    stopPolling,
  };
}
