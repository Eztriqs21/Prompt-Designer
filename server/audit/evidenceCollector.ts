import { v4 as uuidv4 } from 'uuid';
import type { AuditEvidence } from '../db/auditStore.js';
import { getJobEvidenceDir } from '../db/auditStore.js';

const fs = await import('fs');
const path = await import('path');

// ─── Evidence Collector Type ───────────────────────────────

export interface EvidenceCollector {
  jobId: string;
  evidence: AuditEvidence[];
  add(type: AuditEvidence['type'], stage: string, data: Record<string, any>): AuditEvidence;
  getAll(): AuditEvidence[];
}

// ─── Factory ───────────────────────────────────────────────

export function createEvidenceCollector(jobId: string): EvidenceCollector {
  const evidenceDir = getJobEvidenceDir(jobId);
  const evidence: AuditEvidence[] = [];

  return {
    jobId,
    evidence,

    add(type, stage, data) {
      const id = uuidv4();
      const evidenceFile = `${id}.json`;
      const filePath = path.join(evidenceDir, evidenceFile);

      // Write evidence data to file
      fs.writeFileSync(filePath, JSON.stringify({
        id,
        type,
        stage,
        data,
        createdAt: Date.now(),
      }, null, 2), 'utf-8');

      const record: AuditEvidence = {
        id,
        type,
        jobStage: stage,
        filePath: `evidence/${evidenceFile}`,
        timestamp: Date.now(),
        metadata: data,
      };

      evidence.push(record);
      return record;
    },

    getAll() {
      return [...evidence];
    },
  };
}

// ─── Standalone Functions ──────────────────────────────────

/**
 * Store a piece of evidence for a job. Returns the evidence ID.
 */
export function storeEvidence(
  evidenceId: string,
  type: AuditEvidence['type'],
  data: Record<string, any>,
): AuditEvidence {
  return {
    id: evidenceId,
    type,
    jobStage: 'unknown',
    filePath: '',
    timestamp: Date.now(),
    metadata: data,
  };
}

/**
 * Link evidence records to findings by matching evidence IDs.
 */
export function linkEvidenceToFindings(
  findings: { evidence?: string }[],
  evidence: AuditEvidence[],
): void {
  const evidenceMap = new Map(evidence.map((e) => [e.id, e]));
  for (const finding of findings) {
    if (finding.evidence && !evidenceMap.has(finding.evidence)) {
      // Evidence ID doesn't exist — clear the reference
      finding.evidence = undefined;
    }
  }
}

/**
 * Get all evidence files for a job from disk.
 */
export function loadJobEvidence(jobId: string): AuditEvidence[] {
  const evidenceDir = getJobEvidenceDir(jobId);
  if (!fs.existsSync(evidenceDir)) return [];

  const files = fs.readdirSync(evidenceDir).filter((f) => f.endsWith('.json'));
  return files.map((file) => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(evidenceDir, file), 'utf-8'));
      return {
        id: data.id,
        type: data.type,
        jobStage: data.stage,
        filePath: `evidence/${file}`,
        timestamp: data.createdAt,
        metadata: data.data,
      } as AuditEvidence;
    } catch {
      return null;
    }
  }).filter((e): e is AuditEvidence => e !== null);
}
