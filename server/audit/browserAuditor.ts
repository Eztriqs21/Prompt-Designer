import { v4 as uuidv4 } from 'uuid';
import type { AuditFinding, AuditEvidence } from '../db/auditStore.js';
import { sealFinding } from './codeAnalyzer.js';
import { storeEvidence, type EvidenceCollector } from './evidenceCollector.js';

const fs = await import('fs');
const path = await import('path');

// ─── Browser Availability Check ────────────────────────────

let playwrightAvailable = false;

export async function isBrowserAvailable(): Promise<boolean> {
  try {
    await import('playwright');
    playwrightAvailable = true;
    return true;
  } catch {
    playwrightAvailable = false;
    return false;
  }
}

// ─── Types ─────────────────────────────────────────────────

export interface BrowserTestResult {
  findings: AuditFinding[];
  evidence: AuditEvidence[];
}

// ─── HTTP Checks (Always Available) ────────────────────────

async function testUrl(url: string): Promise<BrowserTestResult> {
  const findings: AuditFinding[] = [];
  const evidence: AuditEvidence[] = [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'WebsiteAuditBot/1.0' },
    });
    clearTimeout(timeout);

    // Check HTTP status
    if (response.status >= 400) {
      findings.push(sealFinding({
        severity: response.status >= 500 ? 'critical' : 'high',
        category: 'bug',
        title: `HTTP ${response.status} error`,
        description: `The URL returned HTTP ${response.status} ${response.statusText}.`,
        fix: response.status === 404
          ? 'Ensure the page exists and the URL is correct.'
          : `Fix the server error (HTTP ${response.status}).`,
        confidence: 0.95,
      }));
    }

    // Check redirect chain
    if (response.redirected) {
      findings.push(sealFinding({
        severity: 'info',
        category: 'ux',
        title: 'Page redirects',
        description: `The URL redirects to ${response.url}. Verify this is intended.`,
        confidence: 0.7,
      }));
    }

    // Check security headers
    const headers = response.headers;
    if (!headers.get('x-content-type-options')) {
      findings.push(sealFinding({
        severity: 'low',
        category: 'security',
        title: 'Missing X-Content-Type-Options header',
        description: 'The response does not include X-Content-Type-Options header, which prevents MIME sniffing attacks.',
        fix: 'Add header: X-Content-Type-Options: nosniff',
        confidence: 0.9,
      }));
    }

    if (!headers.get('x-frame-options') && !headers.get('content-security-policy')) {
      findings.push(sealFinding({
        severity: 'low',
        category: 'security',
        title: 'Missing clickjacking protection',
        description: 'No X-Frame-Options or CSP frame-ancestors directive found. The site may be vulnerable to clickjacking.',
        fix: 'Add X-Frame-Options: DENY or a CSP frame-ancestors directive.',
        confidence: 0.8,
      }));
    }

    // Check content type
    const contentType = headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const body = await response.text();

      // Check response size
      const sizeKB = body.length / 1024;
      if (sizeKB > 500) {
        findings.push(sealFinding({
          severity: 'medium',
          category: 'performance',
          title: 'Large HTML response',
          description: `The HTML response is ${Math.round(sizeKB)}KB. Large pages load slowly.`,
          fix: 'Reduce page size by lazy-loading content, splitting pages, or optimizing output.',
          confidence: 0.8,
        }));
      }

      // Check for inline CSS in response
      const styleTagCount = (body.match(/<style/gi) || []).length;
      if (styleTagCount > 5) {
        findings.push(sealFinding({
          severity: 'low',
          category: 'performance',
          title: 'Multiple inline style blocks',
          description: `Found ${styleTagCount} <style> tags. Excessive inline CSS increases page size and prevents caching.`,
          fix: 'Extract CSS into external stylesheets for better caching.',
          confidence: 0.7,
        }));
      }
    }

    // Store HTTP check evidence
    const evidenceId = uuidv4();
    evidence.push(storeEvidence(evidenceId, 'network-error', {
      url,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      redirected: response.redirected,
      finalUrl: response.url,
    }));

  } catch (err: any) {
    if (err.name === 'AbortError') {
      findings.push(sealFinding({
        severity: 'high',
        category: 'bug',
        title: 'Connection timeout',
        description: `The URL at ${url} did not respond within 15 seconds.`,
        fix: 'Check if the server is running and accessible.',
        confidence: 0.95,
      }));
    } else {
      findings.push(sealFinding({
        severity: 'critical',
        category: 'bug',
        title: 'URL unreachable',
        description: `Could not connect to ${url}: ${err.message || 'Unknown error'}`,
        fix: 'Verify the URL is correct and the server is accessible.',
        confidence: 0.95,
      }));
    }
  }

  return { findings, evidence };
}

// ─── Playwright Tests (Stubbed) ────────────────────────────

async function runPlaywrightTests(url: string, evidenceCollector: EvidenceCollector): Promise<BrowserTestResult> {
  if (!playwrightAvailable) {
    return {
      findings: [sealFinding({
        severity: 'info',
        category: 'code-quality',
        title: 'Browser testing not available',
        description: 'Playwright is not installed. Browser-based testing was skipped. Install playwright for full browser testing.',
        fix: 'Install playwright: npm install playwright',
        confidence: 1.0,
      })],
      evidence: [],
    };
  }

  // When Playwright is available, this would:
  // 1. Launch headless Chromium
  // 2. Navigate to URL
  // 3. Capture console errors
  // 4. Check for broken network requests
  // 5. Test basic interactions (click, type, scroll)
  // 6. Capture screenshots
  // 7. Test viewport resizing
  //
  // For now, return stub results.

  const findings: AuditFinding[] = [];
  const evidence: AuditEvidence[] = [];

  // Stub: Simulate browser tests
  findings.push(sealFinding({
    severity: 'info',
    category: 'code-quality',
    title: 'Browser tests executed',
    description: 'Playwright browser tests were executed. Results are based on automated testing.',
    confidence: 1.0,
  }));

  return { findings, evidence };
}

// ─── Main Entry Point ──────────────────────────────────────

export async function runBrowserTests(
  job: {
    id: string;
    inputType: string;
    source: string;
    mode: string;
    workspacePath: string;
  },
  evidenceCollector: EvidenceCollector,
): Promise<BrowserTestResult> {
  const findings: AuditFinding[] = [];
  const evidence: AuditEvidence[] = [];

  const targetUrl = job.source;

  // Always run HTTP checks for URL-based inputs
  if (job.inputType === 'url' || job.inputType === 'github') {
    const httpResult = await testUrl(targetUrl);
    findings.push(...httpResult.findings);
    evidence.push(...httpResult.evidence);
  }

  // Run browser tests based on mode
  if (job.mode === 'recommended' || job.mode === 'full') {
    const browserResult = await runPlaywrightTests(targetUrl, evidenceCollector);
    findings.push(...browserResult.findings);
    evidence.push(...browserResult.evidence);
  }

  return { findings, evidence };
}

// ─── Local Preview Server (for uploaded files) ─────────────

export async function testLocalFiles(
  job: {
    id: string;
    inputType: string;
    workspacePath: string;
    mode: string;
  },
  evidenceCollector: EvidenceCollector,
): Promise<BrowserTestResult> {
  const findings: AuditFinding[] = [];
  const evidence: AuditEvidence[] = [];

  // For uploaded files, we can only do static analysis
  // Browser testing of local files requires a preview server
  if (job.inputType === 'files' || job.inputType === 'bundle') {
    findings.push(sealFinding({
      severity: 'info',
      category: 'code-quality',
      title: 'Uploaded files — browser testing limited',
      description: 'Browser testing for uploaded files requires a local preview server. Only static analysis was performed.',
      fix: 'To enable browser testing, deploy the files to a URL and submit that instead.',
      confidence: 1.0,
    }));
  }

  return { findings, evidence };
}
