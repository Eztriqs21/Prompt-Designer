import simpleGit from 'simple-git';
import AdmZip from 'adm-zip';
import type { Express } from 'express';
import { ensureJobWorkspace, type AuditInputType, type AuditJob } from '../db/auditStore.js';

const fs = await import('fs');
const path = await import('path');

// ─── Allowed File Types ────────────────────────────────────

const ALLOWED_EXTENSIONS = new Set([
  '.html', '.htm', '.css', '.js', '.ts', '.jsx', '.tsx',
  '.json', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico',
  '.woff', '.woff2', '.ttf', '.eot', '.md', '.txt',
  '.map', '.yaml', '.yml', '.toml', '.env',
]);

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB per file
const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB total

// ─── Validation ────────────────────────────────────────────

export function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must use http or https protocol' };
    }
    // Reject private IPs and localhost
    const hostname = parsed.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname === '[::1]'
    ) {
      return { valid: false, error: 'URL must be a public address, not localhost or private IP' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

export function validateGitHubUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'github.com') {
      return { valid: false, error: 'URL must be a GitHub repository URL (github.com)' };
    }
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) {
      return { valid: false, error: 'URL must point to a repository: github.com/{owner}/{repo}' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid GitHub URL format' };
  }
}

export function validateUploadedFiles(files: Express.Multer.File[]): { valid: boolean; error?: string } {
  if (!files || files.length === 0) {
    return { valid: false, error: 'No files provided' };
  }

  let totalSize = 0;
  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return { valid: false, error: `Unsupported file type: ${ext}. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}` };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File "${file.originalname}" exceeds 2MB limit` };
    }
    totalSize += file.size;
    if (totalSize > MAX_TOTAL_SIZE) {
      return { valid: false, error: 'Total upload size exceeds 10MB limit' };
    }
  }
  return { valid: true };
}

// ─── Ingestion Functions ───────────────────────────────────

export interface IngestionResult {
  fileCount: number;
  framework?: string;
  entryPoints: string[];
  targetUrl?: string;
}

/**
 * Ingest a URL input — store the URL as the browser target.
 * No files to ingest, just metadata.
 */
export async function ingestUrl(job: AuditJob): Promise<IngestionResult> {
  const workspace = ensureJobWorkspace(job.id);
  const metadata = {
    inputType: 'url',
    source: job.source,
    ingestedAt: Date.now(),
  };
  fs.writeFileSync(path.join(workspace, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');

  return {
    fileCount: 0,
    framework: undefined,
    entryPoints: [],
    targetUrl: job.source,
  };
}

/**
 * Ingest a GitHub repo — shallow clone into workspace.
 */
export async function ingestGitHub(job: AuditJob): Promise<IngestionResult> {
  const workspace = ensureJobWorkspace(job.id);
  const repoDir = path.join(workspace, 'repo');

  const git = simpleGit();
  await git.clone(job.source, repoDir, ['--depth', '1']);

  // Read the cloned repo to detect framework and entry points
  const result = await analyzeWorkspace(repoDir);
  result.targetUrl = job.source;

  return result;
}

/**
 * Ingest uploaded files — write them into workspace.
 */
export async function ingestFiles(job: AuditJob, files: Express.Multer.File[]): Promise<IngestionResult> {
  const workspace = ensureJobWorkspace(job.id);
  const filesDir = path.join(workspace, 'files');

  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }

  for (const file of files) {
    const safePath = sanitizePath(file.originalname);
    const targetPath = path.join(filesDir, safePath);
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetPath, file.buffer);
  }

  return await analyzeWorkspace(filesDir);
}

/**
 * Ingest a zip bundle — extract into workspace.
 */
export async function ingestBundle(job: AuditJob, files: Express.Multer.File[]): Promise<IngestionResult> {
  const workspace = ensureJobWorkspace(job.id);
  const filesDir = path.join(workspace, 'files');

  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }

  for (const file of files) {
    if (file.originalname.endsWith('.zip')) {
      const zip = new AdmZip(file.buffer);
      // Validate zip contents before extracting
      const entries = zip.getEntries();
      for (const entry of entries) {
        if (entry.entryName.includes('..')) {
          throw new Error('Zip contains path traversal entries — rejected');
        }
      }
      zip.extractAllTo(filesDir, true);
    } else {
      const safePath = sanitizePath(file.originalname);
      const targetPath = path.join(filesDir, safePath);
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(targetPath, file.buffer);
    }
  }

  return await analyzeWorkspace(filesDir);
}

// ─── Workspace Analysis ────────────────────────────────────

export async function analyzeWorkspace(workspacePath: string): Promise<IngestionResult> {
  const files = readDirRecursive(workspacePath);
  const entryPoints: string[] = [];
  let framework: string | undefined;

  // Check for package.json
  const pkgJsonPath = path.join(workspacePath, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (allDeps.react) framework = 'react';
      else if (allDeps.vue) framework = 'vue';
      else if (allDeps.next) framework = 'next';
      else if (allDeps.svelte) framework = 'svelte';
      else if (allDeps.angular || allDeps['@angular/core']) framework = 'angular';
    } catch { /* ignore */ }
  }

  // Check for entry points
  const candidates = [
    'index.html', 'src/index.html',
    'src/main.tsx', 'src/main.ts', 'src/main.js', 'src/index.tsx', 'src/index.ts', 'src/index.js',
    'src/App.tsx', 'src/App.ts', 'src/App.vue',
    'pages/index.tsx', 'pages/index.ts',
    'app/page.tsx', 'app/page.ts',
  ];
  for (const candidate of candidates) {
    const full = path.join(workspacePath, candidate);
    if (fs.existsSync(full)) {
      entryPoints.push(candidate);
    }
  }

  // If no entry points found, look for any HTML file
  if (entryPoints.length === 0) {
    const htmlFiles = files.filter((f) => f.endsWith('.html'));
    entryPoints.push(...htmlFiles.slice(0, 3));
  }

  return {
    fileCount: files.length,
    framework,
    entryPoints,
  };
}

// ─── Helpers ───────────────────────────────────────────────

function readDirRecursive(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, .git, dist, build
      if (['node_modules', '.git', 'dist', 'build', '.next', '.nuxt'].includes(entry.name)) continue;
      results.push(...readDirRecursive(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

function sanitizePath(inputPath: string): string {
  // Remove path traversal and absolute paths
  const normalized = inputPath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter((p) => p && p !== '..' && !p.startsWith(':'));
  return parts.join('/') || 'index.html';
}
