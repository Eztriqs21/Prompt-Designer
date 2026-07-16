import { Router } from 'express';
import multer from 'multer';
import {
  createAuditJob,
  getAuditJob,
  getAllAuditJobs,
  deleteAuditJob,
  getJobEvidenceDir,
  type AuditInputType,
  type AuditMode,
} from '../db/auditStore.js';
import { validateUrl, validateGitHubUrl, validateUploadedFiles } from '../audit/ingestion.js';
import { checkAuditRateLimit } from '../middleware/auditRateLimit.js';
import { runPipelineWithTimeout } from '../audit/pipeline.js';
import type { Express } from 'express';

const fs = await import('fs');
const path = await import('path');

const router = Router();

// ─── Multer Config ─────────────────────────────────────────

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB per file
    files: 20, // Max 20 files
  },
});

// ─── Helpers ───────────────────────────────────────────────

function getClientIp(req: any): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

const VALID_INPUT_TYPES = ['url', 'github', 'files', 'bundle'];
const VALID_MODES = ['basic', 'recommended', 'full'];

// ─── POST /api/audit — Create Audit Job ────────────────────

router.post('/', upload.array('files', 20), async (req, res) => {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkAuditRateLimit(ip);

    if (!rateCheck.allowed) {
      res.status(429).json({
        error: 'Daily audit limit reached. You can run up to 3 audits per day.',
        resetTime: rateCheck.resetTime,
      });
      return;
    }

    const { inputType, mode } = req.body ?? {};
    let source = (req.body?.source || '') as string;

    // Validate input type
    if (!inputType || !VALID_INPUT_TYPES.includes(inputType)) {
      res.status(400).json({
        error: `Invalid inputType: ${inputType}. Must be one of: ${VALID_INPUT_TYPES.join(', ')}`,
      });
      return;
    }

    // Validate mode
    if (!mode || !VALID_MODES.includes(mode)) {
      res.status(400).json({
        error: `Invalid mode: ${mode}. Must be one of: ${VALID_MODES.join(', ')}`,
      });
      return;
    }

    // Validate source based on input type
    if (inputType === 'url') {
      if (!source) {
        res.status(400).json({ error: 'source (URL) is required for url input type' });
        return;
      }
      // Sanitize URL: trim, strip trailing dots/slashes that break navigation
      source = source.trim().replace(/\.+$/, '').replace(/\/+$/, '') + '/';
      const urlCheck = validateUrl(source);
      if (!urlCheck.valid) {
        res.status(400).json({ error: urlCheck.error });
        return;
      }
    } else if (inputType === 'github') {
      if (!source) {
        res.status(400).json({ error: 'source (GitHub URL) is required for github input type' });
        return;
      }
      source = source.trim().replace(/\.+$/, '').replace(/\/+$/, '') + '/';
      const ghCheck = validateGitHubUrl(source);
      if (!ghCheck.valid) {
        res.status(422).json({ error: ghCheck.error });
        return;
      }
    } else if (inputType === 'files' || inputType === 'bundle') {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'files are required for files/bundle input type' });
        return;
      }
      const fileCheck = validateUploadedFiles(files);
      if (!fileCheck.valid) {
        res.status(422).json({ error: fileCheck.error });
        return;
      }
    }

    // Create the job
    const job = createAuditJob({
      inputType: inputType as AuditInputType,
      source: source || '',
      mode: mode as AuditMode,
    });

    // Attach files to the job object for the pipeline to use
    if (inputType === 'files' || inputType === 'bundle') {
      (job as any).files = req.files;
    }

    // Start the pipeline asynchronously
    runPipelineWithTimeout(job.id);

    // Return job immediately
    res.status(201).json({
      id: job.id,
      inputType: job.inputType,
      source: job.source,
      mode: job.mode,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      remaining: rateCheck.remaining,
    });
  } catch (error: any) {
    console.error('Error in POST /api/audit:', error);
    res.status(500).json({ error: 'Failed to create audit job' });
  }
});

// ─── GET /api/audit/:jobId — Get Job Status ────────────────

router.get('/:jobId', (req, res) => {
  const job = getAuditJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Audit job not found' });
    return;
  }

  // Partial data is preserved server-side even when a stage fails
  // (see pipeline.ts). Expose it so the UI can render findings instead
  // of a blank error page.
  const partial =
    job.status === 'failed' &&
    ((job.findings?.length ?? 0) > 0 ||
      (job.evidence?.length ?? 0) > 0 ||
      Boolean(job.report));

  res.json({
    id: job.id,
    inputType: job.inputType,
    source: job.source,
    mode: job.mode,
    status: job.status,
    progress: job.progress,
    stages: job.stages,
    error: job.error,
    partial,
    findings: job.findings ?? [],
    evidence: job.evidence ?? [],
    report: job.report ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
  });
});

// ─── GET /api/audit/:jobId/report — Get Full Report ────────

router.get('/:jobId/report', (req, res) => {
  const job = getAuditJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Audit job not found' });
    return;
  }

  if (job.status !== 'complete') {
    res.status(202).json({
      error: 'Report not ready',
      status: job.status,
      progress: job.progress,
    });
    return;
  }

  res.json({
    id: job.id,
    inputType: job.inputType,
    source: job.source,
    mode: job.mode,
    status: job.status,
    report: job.report,
    completedAt: job.completedAt,
  });
});

// ─── GET /api/audit/:jobId/evidence/:evidenceId ────────────

router.get('/:jobId/evidence/:evidenceId', (req, res) => {
  const job = getAuditJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Audit job not found' });
    return;
  }

  const evidenceDir = getJobEvidenceDir(req.params.jobId);
  const evidenceFile = `${req.params.evidenceId}.json`;
  const filePath = path.join(evidenceDir, evidenceFile);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Evidence not found' });
    return;
  }

  const evidence = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  res.json(evidence);
});

// ─── GET /api/audit — List All Jobs ────────────────────────

router.get('/', (_req, res) => {
  const jobs = getAllAuditJobs();
  const summaries = jobs.map((job) => ({
    id: job.id,
    inputType: job.inputType,
    source: job.source,
    mode: job.mode,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  }));
  res.json(summaries);
});

// ─── DELETE /api/audit/:jobId — Delete Job ─────────────────

router.delete('/:jobId', async (req, res) => {
  const deleted = await deleteAuditJob(req.params.jobId);
  if (!deleted) {
    res.status(404).json({ error: 'Audit job not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
