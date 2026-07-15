import { v4 as uuidv4 } from 'uuid';

const fs = await import('fs');
const path = await import('path');

const DB_DIR = path.join(process.cwd(), 'server', 'db');
const AUDIT_JOBS_PATH = path.join(DB_DIR, 'auditJobs.json');
const AUDIT_WORKSPACE_BASE = path.join(DB_DIR, 'audit-workspace');

// ─── Types ─────────────────────────────────────────────────

export type AuditInputType = 'url' | 'github' | 'files' | 'bundle';
export type AuditMode = 'basic' | 'recommended' | 'full';
export type AuditStatus =
  | 'queued'
  | 'ingesting'
  | 'analyzing'
  | 'testing'
  | 'accessibility'
  | 'collecting'
  | 'summarizing'
  | 'complete'
  | 'failed';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingCategory = 'bug' | 'loophole' | 'ux' | 'security' | 'accessibility' | 'performance' | 'code-quality';

export interface AuditFinding {
  id: string;
  severity: Severity;
  category: FindingCategory;
  title: string;
  description: string;
  file?: string;
  line?: number;
  evidence?: string;
  fix?: string;
  confidence: number;
}

export interface AuditEvidence {
  id: string;
  type: 'screenshot' | 'console-log' | 'network-error' | 'trace' | 'dom-snapshot' | 'performance-metrics' | 'viewport-test';
  jobStage: string;
  filePath: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface AuditReport {
  summary: string;
  score: number;
  severityCounts: Record<Severity, number>;
  findings: AuditFinding[];
  codeIssues: AuditFinding[];
  browserIssues: AuditFinding[];
  accessibilityIssues: AuditFinding[];
  performanceIssues: AuditFinding[];
  recommendations: string[];
  evidence: AuditEvidence[];
}

export interface AuditJobStages {
  ingesting: { status: string; startedAt?: number; completedAt?: number };
  analyzing: { status: string; startedAt?: number; completedAt?: number };
  testing: { status: string; startedAt?: number; completedAt?: number };
  accessibility: { status: string; startedAt?: number; completedAt?: number };
  collecting: { status: string; startedAt?: number; completedAt?: number };
  summarizing: { status: string; startedAt?: number; completedAt?: number };
}

export interface AuditJob {
  id: string;
  inputType: AuditInputType;
  source: string;
  workspacePath: string;
  mode: AuditMode;
  status: AuditStatus;
  progress: number;
  stages: AuditJobStages;
  findings: AuditFinding[];
  evidence: AuditEvidence[];
  report: AuditReport | null;
  error?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

// ─── Mutex ─────────────────────────────────────────────────

const writeLocks = new Map<string, Promise<void>>();

async function withWriteLock<T>(key: string, fn: () => T): Promise<T> {
  while (writeLocks.has(key)) {
    await writeLocks.get(key);
  }
  let release: () => void;
  const lock = new Promise<void>((resolve) => { release = resolve; });
  writeLocks.set(key, lock);
  try {
    return fn();
  } finally {
    writeLocks.delete(key);
    release!();
  }
}

// ─── JSON I/O ──────────────────────────────────────────────

function ensureDbExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(AUDIT_JOBS_PATH)) {
    fs.writeFileSync(AUDIT_JOBS_PATH, '[]', 'utf-8');
  }
  if (!fs.existsSync(AUDIT_WORKSPACE_BASE)) {
    fs.mkdirSync(AUDIT_WORKSPACE_BASE, { recursive: true });
  }
}

function readJobs(): AuditJob[] {
  ensureDbExists();
  const data = fs.readFileSync(AUDIT_JOBS_PATH, 'utf-8');
  return JSON.parse(data);
}

function writeJobs(data: AuditJob[]) {
  ensureDbExists();
  fs.writeFileSync(AUDIT_JOBS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Workspace Helpers ─────────────────────────────────────

export function getJobWorkspace(jobId: string): string {
  return path.join(AUDIT_WORKSPACE_BASE, jobId);
}

export function ensureJobWorkspace(jobId: string): string {
  const workspace = getJobWorkspace(jobId);
  if (!fs.existsSync(workspace)) {
    fs.mkdirSync(workspace, { recursive: true });
  }
  return workspace;
}

export function getJobEvidenceDir(jobId: string): string {
  const evidenceDir = path.join(getJobWorkspace(jobId), 'evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
  return evidenceDir;
}

// ─── CRUD ──────────────────────────────────────────────────

export function createAuditJob(data: {
  inputType: AuditInputType;
  source: string;
  mode: AuditMode;
}): AuditJob {
  const jobs = readJobs();
  const jobId = uuidv4();
  const now = Date.now();
  const job: AuditJob = {
    id: jobId,
    inputType: data.inputType,
    source: data.source,
    workspacePath: getJobWorkspace(jobId),
    mode: data.mode,
    status: 'queued',
    progress: 0,
    stages: {
      ingesting: { status: 'pending' },
      analyzing: { status: 'pending' },
      testing: { status: 'pending' },
      accessibility: { status: 'pending' },
      collecting: { status: 'pending' },
      summarizing: { status: 'pending' },
    },
    findings: [],
    evidence: [],
    report: null,
    createdAt: now,
    updatedAt: now,
  };
  ensureJobWorkspace(jobId);
  jobs.unshift(job);
  writeJobs(jobs);
  return job;
}

export function getAuditJob(id: string): AuditJob | undefined {
  const jobs = readJobs();
  return jobs.find((j) => j.id === id);
}

export function getAllAuditJobs(): AuditJob[] {
  return readJobs();
}

export async function updateAuditJob(id: string, updates: Partial<Omit<AuditJob, 'id' | 'createdAt'>>): Promise<AuditJob | undefined> {
  return withWriteLock(AUDIT_JOBS_PATH, () => {
    const jobs = readJobs();
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx === -1) return undefined;
    jobs[idx] = { ...jobs[idx], ...updates, updatedAt: Date.now() };
    writeJobs(jobs);
    return jobs[idx];
  });
}

export async function deleteAuditJob(id: string): Promise<boolean> {
  return withWriteLock(AUDIT_JOBS_PATH, () => {
    const jobs = readJobs();
    const filtered = jobs.filter((j) => j.id !== id);
    if (filtered.length === jobs.length) return false;
    writeJobs(filtered);
    const workspace = getJobWorkspace(id);
    if (fs.existsSync(workspace)) {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
    return true;
  });
}
