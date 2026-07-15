import type { AuditJob, AuditFinding, AuditEvidence } from '../db/auditStore.js';
import { getAuditJob, updateAuditJob } from '../db/auditStore.js';
import { ingestUrl, ingestGitHub, ingestFiles, ingestBundle, type IngestionResult } from './ingestion.js';
import { analyzeCode } from './codeAnalyzer.js';
import { runBrowserTests, testLocalFiles } from './browserAuditor.js';
import { runAccessibilityChecks, runPerformanceChecks } from './accessibility.js';
import { createEvidenceCollector, type EvidenceCollector } from './evidenceCollector.js';
import { generateReport } from './reportGenerator.js';
import type { Express } from 'express';

// ─── Pipeline Stage Runner ─────────────────────────────────

interface StageResult {
  findings: AuditFinding[];
  evidence: AuditEvidence[];
}

async function runStage<T>(
  job: AuditJob,
  stageName: keyof AuditJob['stages'],
  fn: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  await updateAuditJob(job.id, {
    status: stageName as any,
    stages: {
      ...job.stages,
      [stageName]: { status: 'running', startedAt: now },
    },
  });

  try {
    const result = await fn();
    const completedAt = Date.now();
    await updateAuditJob(job.id, {
      stages: {
        ...job.stages,
        [stageName]: { status: 'completed', startedAt: now, completedAt },
      },
    });
    return result;
  } catch (err: any) {
    await updateAuditJob(job.id, {
      stages: {
        ...job.stages,
        [stageName]: { status: 'failed', startedAt: now },
      },
    });
    throw err;
  }
}

// ─── Progress Calculator ───────────────────────────────────

function calculateProgress(job: AuditJob, currentStage: string): number {
  const stageOrder = ['ingesting', 'analyzing', 'testing', 'accessibility', 'collecting', 'summarizing'];
  const stageIndex = stageOrder.indexOf(currentStage);
  if (stageIndex === -1) return 0;

  // Each stage contributes to progress
  const baseProgress = (stageIndex / stageOrder.length) * 100;
  const stageIncrement = 100 / stageOrder.length;
  return Math.min(99, Math.round(baseProgress + stageIncrement * 0.5));
}

// ─── Main Pipeline ─────────────────────────────────────────

export async function runPipeline(jobId: string): Promise<void> {
  let job = getAuditJob(jobId);
  if (!job) {
    console.error(`Pipeline: Job ${jobId} not found`);
    return;
  }

  const evidenceCollector = createEvidenceCollector(jobId);
  let allFindings: AuditFinding[] = [];
  let allEvidence: AuditEvidence[] = [];
  let ingestionResult: IngestionResult | undefined;

  try {
    // ── Stage 1: Ingestion ──────────────────────────────
    ingestionResult = await runStage(job, 'ingesting', async () => {
      let result: IngestionResult;
      switch (job.inputType) {
        case 'url':
          result = await ingestUrl(job);
          break;
        case 'github':
          result = await ingestGitHub(job);
          break;
        case 'files':
          result = await ingestFiles(job, (job as any).files || []);
          break;
        case 'bundle':
          result = await ingestBundle(job, (job as any).files || []);
          break;
        default:
          throw new Error(`Unknown input type: ${job.inputType}`);
      }
      return result;
    });

    await updateAuditJob(jobId, { progress: calculateProgress(job, 'ingesting') });

    // ── Stage 2: Code Analysis ──────────────────────────
    if (job.inputType !== 'url') {
      const codeFindings = await runStage(job, 'analyzing', async () => {
        // Determine workspace path with files
        const workspace = job.workspacePath;
        const filesDir = job.inputType === 'github'
          ? `${workspace}/repo`
          : `${workspace}/files`;
        return analyzeCode(filesDir);
      });

      allFindings.push(...codeFindings);
      await updateAuditJob(jobId, {
        progress: calculateProgress(job, 'analyzing'),
        findings: allFindings,
      });
    } else {
      // For URL-only, skip code analysis but mark stage complete
      await updateAuditJob(jobId, {
        stages: {
          ...job.stages,
          analyzing: { status: 'skipped', startedAt: Date.now(), completedAt: Date.now() },
        },
      });
    }

    // ── Stage 3: Browser Testing ────────────────────────
    if (job.mode === 'recommended' || job.mode === 'full') {
      console.log(`[Pipeline] Testing stage: job=${job.id} mode=${job.mode} inputType=${job.inputType}`);
      const browserResult = await runStage(job, 'testing', async () => {
        if (job.inputType === 'url' || job.inputType === 'github') {
          return runBrowserTests(job, evidenceCollector);
        }
        return testLocalFiles(job, evidenceCollector);
      });

      allFindings.push(...browserResult.findings);
      allEvidence.push(...browserResult.evidence);
      console.log(`[Pipeline] Testing stage done: job=${job.id} browserFindings=${browserResult.findings.length} browserEvidence=${browserResult.evidence.length}`);
      await updateAuditJob(jobId, {
        progress: calculateProgress(job, 'testing'),
        findings: allFindings,
        evidence: allEvidence,
      });
    } else {
      console.log(`[Pipeline] Testing stage skipped: job=${job.id} mode=${job.mode}`);
      await updateAuditJob(jobId, {
        stages: {
          ...job.stages,
          testing: { status: 'skipped', startedAt: Date.now(), completedAt: Date.now() },
        },
      });
    }

    // ── Stage 4: Accessibility + Performance (Full only) ─
    if (job.mode === 'full') {
      const a11yResult = await runStage(job, 'accessibility', async () => {
        const workspace = job.inputType === 'github'
          ? `${job.workspacePath}/repo`
          : job.inputType === 'url' ? '' : `${job.workspacePath}/files`;

        if (!workspace) return { findings: [], evidence: [] };

        const a11yFindings = await runAccessibilityChecks(workspace);
        const perfFindings = await runPerformanceChecks(workspace);
        return { findings: [...a11yFindings, ...perfFindings], evidence: [] };
      });

      allFindings.push(...a11yResult.findings);
      allEvidence.push(...a11yResult.evidence);
      await updateAuditJob(jobId, {
        progress: calculateProgress(job, 'accessibility'),
        findings: allFindings,
        evidence: allEvidence,
      });
    } else {
      await updateAuditJob(jobId, {
        stages: {
          ...job.stages,
          accessibility: { status: 'skipped', startedAt: Date.now(), completedAt: Date.now() },
        },
      });
    }

    // ── Stage 5: Evidence Collection ─────────────────────
    const collectedEvidence = await runStage(job, 'collecting', async () => {
      // Merge all evidence from stages
      const allCollected = evidenceCollector.getAll();
      return { findings: [], evidence: allCollected };
    });

    allEvidence.push(...collectedEvidence.evidence);
    // Deduplicate evidence by ID
    const seenEvidenceIds = new Set<string>();
    allEvidence = allEvidence.filter((e) => {
      if (seenEvidenceIds.has(e.id)) return false;
      seenEvidenceIds.add(e.id);
      return true;
    });

    await updateAuditJob(jobId, {
      progress: calculateProgress(job, 'collecting'),
      evidence: allEvidence,
    });

    // ── Stage 6: Report Generation ──────────────────────
    const report = await runStage(job, 'summarizing', async () => {
      return generateReport(
        allFindings,
        allEvidence,
        job.inputType,
        job.source,
        job.mode,
      );
    });

    // ── Complete ────────────────────────────────────────
    await updateAuditJob(jobId, {
      status: 'complete',
      progress: 100,
      findings: allFindings,
      evidence: allEvidence,
      report,
      completedAt: Date.now(),
    });

    console.log(`Pipeline: Job ${jobId} completed successfully`);

  } catch (err: any) {
    console.error(`Pipeline: Job ${jobId} failed:`, err);
    await updateAuditJob(jobId, {
      status: 'failed',
      error: err.message || 'Pipeline failed unexpectedly',
      findings: allFindings,
      evidence: allEvidence,
    });
  }
}

// ─── Pipeline Timeout Guard ────────────────────────────────

const MAX_PIPELINE_TIME = 5 * 60 * 1000; // 5 minutes

export function runPipelineWithTimeout(jobId: string): void {
  const pipelinePromise = runPipeline(jobId);

  // Set a timeout to prevent infinite pipelines
  const timeout = setTimeout(async () => {
    const job = getAuditJob(jobId);
    if (job && job.status !== 'complete' && job.status !== 'failed') {
      console.error(`Pipeline: Job ${jobId} timed out after ${MAX_PIPELINE_TIME / 1000}s`);
      await updateAuditJob(jobId, {
        status: 'failed',
        error: 'Audit timed out after 5 minutes',
      });
    }
  }, MAX_PIPELINE_TIME);

  // Clear timeout when pipeline completes
  pipelinePromise.finally(() => clearTimeout(timeout));
}
