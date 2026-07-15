import { v4 as uuidv4 } from 'uuid';
import type { AuditFinding, AuditEvidence } from '../db/auditStore.js';
import { sealFinding } from './codeAnalyzer.js';
import { storeEvidence, type EvidenceCollector } from './evidenceCollector.js';
import { execSync } from 'child_process';

const fs = await import('fs');
const path = await import('path');
const http = await import('http');

// ─── Types ─────────────────────────────────────────────────

export interface BrowserTestResult {
  findings: AuditFinding[];
  evidence: AuditEvidence[];
}

interface PlaywrightModules {
  chromium: typeof import('playwright').chromium;
}

// ─── Playwright Lazy Loader ────────────────────────────────

let cachedPlaywright: PlaywrightModules | null = null;
let playwrightLoadFailed = false;
let runtimeInstallAttempted = false;

function getPlaywrightCachePath(): string {
  return process.env.PLAYWRIGHT_BROWSERS_PATH || '';
}

function logPlaywrightDiagnostics(): void {
  const cachePath = getPlaywrightCachePath();
  console.log(`[Playwright Diagnostics] PLAYWRIGHT_BROWSERS_PATH=${cachePath || '(not set)'}`);

  if (cachePath) {
    try {
      const entries = fs.readdirSync(cachePath);
      console.log(`[Playwright Diagnostics] Cache dir contents: ${entries.join(', ') || '(empty)'}`);
    } catch (err: any) {
      console.log(`[Playwright Diagnostics] Cache dir does not exist or is not readable: ${err.message}`);
    }
  }

  // Check expected headless shell path for Linux
  const expectedShellPath = cachePath
    ? path.join(cachePath, 'chromium_headless_shell-1228', 'chrome-headless-shell-linux64', 'chrome-headless-shell')
    : null;
  if (expectedShellPath) {
    const exists = fs.existsSync(expectedShellPath);
    console.log(`[Playwright Diagnostics] Expected headless shell exists: ${exists} — ${expectedShellPath}`);
  }
}

async function tryInstallBrowsersAtRuntime(): Promise<boolean> {
  if (runtimeInstallAttempted) return false;
  runtimeInstallAttempted = true;

  console.log('[Playwright] Attempting runtime browser install...');
  try {
    const cachePath = getPlaywrightCachePath();
    const env = cachePath ? { ...process.env, PLAYWRIGHT_BROWSERS_PATH: cachePath } : { ...process.env };
    execSync('npx playwright install chromium', {
      env,
      stdio: 'pipe',
      timeout: 120_000,
    });
    console.log('[Playwright] Runtime browser install completed successfully.');
    return true;
  } catch (err: any) {
    console.error(`[Playwright] Runtime browser install failed: ${err.message}`);
    return false;
  }
}

async function loadPlaywright(): Promise<PlaywrightModules | null> {
  if (playwrightLoadFailed) return null;
  if (cachedPlaywright) return cachedPlaywright;

  try {
    const pw = await import('playwright');
    cachedPlaywright = { chromium: pw.chromium };
    return cachedPlaywright;
  } catch (err: any) {
    console.error('[Playwright] Module not available:', err.message);
    playwrightLoadFailed = true;
    return null;
  }
}

async function launchBrowser(pw: PlaywrightModules): Promise<ReturnType<typeof pw.chromium.launch> | null> {
  // Attempt 1: Launch directly
  try {
    return await pw.chromium.launch({ headless: true });
  } catch (err: any) {
    console.error(`[Playwright] Initial launch failed: ${err.message}`);
    logPlaywrightDiagnostics();
  }

  // Attempt 2: Install browsers at runtime if missing, then retry
  const installed = await tryInstallBrowsersAtRuntime();
  if (installed) {
    try {
      return await pw.chromium.launch({ headless: true });
    } catch (err: any) {
      console.error(`[Playwright] Launch after runtime install still failed: ${err.message}`);
      logPlaywrightDiagnostics();
    }
  }

  return null;
}

function buildPlaywrightLaunchFailureFinding(err?: string): AuditFinding {
  const cachePath = getPlaywrightCachePath();
  const details = [
    err || 'Unknown error',
    `PLAYWRIGHT_BROWSERS_PATH=${cachePath || '(not set)'}`,
    'Falling back to HTTP-based analysis only.',
  ].join('. ');

  return sealFinding({
    severity: 'info',
    category: 'code-quality',
    title: 'Playwright browser launch failed',
    description: details,
    fix: 'Ensure Chromium is installed during build: npx playwright install --with-deps chromium',
    confidence: 1.0,
  });
}

// ─── Viewport Presets ──────────────────────────────────────

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

// ─── Playwright Browser Testing ────────────────────────────

async function testUrlWithPlaywright(
  url: string,
  evidenceCollector: EvidenceCollector,
): Promise<BrowserTestResult> {
  const findings: AuditFinding[] = [];
  const evidence: AuditEvidence[] = [];
  const pw = await loadPlaywright();

  if (!pw) {
    findings.push(sealFinding({
      severity: 'info',
      category: 'code-quality',
      title: 'Playwright not available',
      description: 'Playwright module could not be imported. Falling back to HTTP-based analysis only.',
      fix: 'Install Playwright: npm install playwright && npx playwright install chromium',
      confidence: 1.0,
    }));
    return { findings, evidence };
  }

  const browser = await launchBrowser(pw);
  if (!browser) {
    findings.push(buildPlaywrightLaunchFailureFinding());
    return { findings, evidence };
  }

  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      userAgent: 'WebsiteAuditBot/1.0 (Playwright)',
    });

    const consoleLogs: Array<{ type: string; text: string; url: string; timestamp: number }> = [];
    const failedRequests: Array<{ url: string; status: number; statusText: string; timestamp: number }> = [];

    // ── Desktop viewport test ────────────────────────────
    const desktopPage = await context.newPage();

    // Collect console messages
    desktopPage.on('console', (msg) => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        url: url,
        timestamp: Date.now(),
      });
    });

    // Collect failed network requests
    desktopPage.on('requestfailed', (req) => {
      failedRequests.push({
        url: req.url(),
        status: 0,
        statusText: req.failure()?.errorText || 'Unknown',
        timestamp: Date.now(),
      });
    });

    desktopPage.on('response', (res) => {
      if (res.status() >= 400) {
        failedRequests.push({
          url: res.url(),
          status: res.status(),
          statusText: res.statusText(),
          timestamp: Date.now(),
        });
      }
    });

    let navigationTimeout = false;
    try {
      await desktopPage.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
    } catch (err: any) {
      if (err.message?.includes('Timeout') || err.message?.includes('timeout')) {
        navigationTimeout = true;
        findings.push(sealFinding({
          severity: 'high',
          category: 'performance',
          title: 'Page load timeout',
          description: `The page at ${url} did not reach network idle within 30 seconds. This may indicate heavy resources or slow server response.`,
          fix: 'Optimize server response time, reduce render-blocking resources, or implement lazy loading.',
          confidence: 0.9,
        }));
      } else {
        findings.push(sealFinding({
          severity: 'critical',
          category: 'bug',
          title: 'Page failed to load',
          description: `Could not navigate to ${url}: ${err.message}`,
          fix: 'Verify the URL is correct and the server is accessible.',
          confidence: 0.95,
        }));
      }
    }

    // ── Screenshot ───────────────────────────────────────
    if (!navigationTimeout) {
      try {
        const screenshotBuffer = await desktopPage.screenshot({ fullPage: true, type: 'png' });
        const screenshotId = uuidv4();
        const screenshotEvidence = evidenceCollector.add(screenshotId, 'testing', {
          url,
          viewport: 'desktop',
          size: screenshotBuffer.length,
          format: 'png',
        });
        // Store screenshot data as base64 in metadata
        screenshotEvidence.metadata = {
          ...screenshotEvidence.metadata,
          base64: screenshotBuffer.toString('base64'),
        };
        evidence.push(screenshotEvidence);
      } catch (err: any) {
        console.error('Screenshot failed:', err.message);
      }
    }

    // ── Console error/warning findings ───────────────────
    const consoleErrors = consoleLogs.filter((l) => l.type === 'error');
    const consoleWarnings = consoleLogs.filter((l) => l.type === 'warning');

    if (consoleErrors.length > 0) {
      findings.push(sealFinding({
        severity: 'high',
        category: 'bug',
        title: `${consoleErrors.length} console error(s) detected`,
        description: `The page produced ${consoleErrors.length} console error(s):\n${consoleErrors.slice(0, 5).map((e) => `- ${e.text}`).join('\n')}`,
        fix: 'Fix the JavaScript errors shown in the console. These indicate runtime issues.',
        confidence: 0.95,
      }));
    }

    if (consoleWarnings.length > 0) {
      findings.push(sealFinding({
        severity: 'medium',
        category: 'code-quality',
        title: `${consoleWarnings.length} console warning(s) detected`,
        description: `The page produced ${consoleWarnings.length} console warning(s):\n${consoleWarnings.slice(0, 5).map((w) => `- ${w.text}`).join('\n')}`,
        fix: 'Review and address console warnings to improve code quality.',
        confidence: 0.8,
      }));
    }

    // Store console log evidence
    if (consoleLogs.length > 0) {
      const consoleEvidenceId = uuidv4();
      evidence.push(evidenceCollector.add(consoleEvidenceId, 'testing', {
        url,
        total: consoleLogs.length,
        errors: consoleErrors.length,
        warnings: consoleWarnings.length,
        logs: consoleLogs.slice(0, 20),
      }));
    }

    // ── Failed network request findings ──────────────────
    if (failedRequests.length > 0) {
      findings.push(sealFinding({
        severity: 'high',
        category: 'bug',
        title: `${failedRequests.length} failed network request(s)`,
        description: `The page triggered ${failedRequests.length} failed network request(s):\n${failedRequests.slice(0, 5).map((r) => `- ${r.url} (${r.status || r.statusText})`).join('\n')}`,
        fix: 'Fix broken resource URLs, API endpoints, or CDN links.',
        confidence: 0.9,
      }));

      const networkEvidenceId = uuidv4();
      evidence.push(evidenceCollector.add(networkEvidenceId, 'testing', {
        url,
        failedRequests: failedRequests.slice(0, 20),
      }));
    }

    // ── Performance metrics ──────────────────────────────
    if (!navigationTimeout) {
      try {
        const perfMetrics = await desktopPage.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const paint = performance.getEntriesByType('paint');
          const resources = performance.getEntriesByType('resource');

          return {
            domContentLoaded: nav?.domContentLoadedEventEnd || 0,
            loadComplete: nav?.loadEventEnd || 0,
            ttfb: nav?.responseStart || 0,
            domInteractive: nav?.domInteractive || 0,
            firstPaint: paint.find((p) => p.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: paint.find((p) => p.name === 'first-contentful-paint')?.startTime || 0,
            totalResources: resources.length,
            totalTransferSize: resources.reduce((sum, r) => sum + ((r as any).transferSize || 0), 0),
          };
        });

        const perfEvidenceId = uuidv4();
        evidence.push(evidenceCollector.add(perfEvidenceId, 'testing', {
          url,
          viewport: 'desktop',
          metrics: perfMetrics,
        }));

        // Flag slow metrics
        if (perfMetrics.loadComplete > 5000) {
          findings.push(sealFinding({
            severity: 'high',
            category: 'performance',
            title: 'Slow page load',
            description: `Full page load took ${(perfMetrics.loadComplete / 1000).toFixed(1)}s. Target is under 3s.`,
            fix: 'Optimize images, enable compression, reduce render-blocking resources, and use a CDN.',
            confidence: 0.85,
          }));
        }

        if (perfMetrics.firstContentfulPaint > 2500) {
          findings.push(sealFinding({
            severity: 'medium',
            category: 'performance',
            title: 'Slow First Contentful Paint',
            description: `FCP took ${(perfMetrics.firstContentfulPaint / 1000).toFixed(1)}s. Target is under 1.8s.`,
            fix: 'Reduce server response time, eliminate render-blocking resources, and inline critical CSS.',
            confidence: 0.85,
          }));
        }

        if (perfMetrics.ttfb > 800) {
          findings.push(sealFinding({
            severity: 'medium',
            category: 'performance',
            title: 'Slow Time to First Byte',
            description: `TTFB was ${(perfMetrics.ttfb / 1000).toFixed(1)}s. Target is under 200ms.`,
            fix: 'Optimize server response time, use caching, or deploy closer to users.',
            confidence: 0.8,
          }));
        }
      } catch (err: any) {
        console.error('Performance metrics collection failed:', err.message);
      }
    }

    // ── DOM snapshot evidence ────────────────────────────
    if (!navigationTimeout) {
      try {
        const domSnapshot = await desktopPage.evaluate(() => {
          const html = document.documentElement.outerHTML;
          return {
            length: html.length,
            title: document.title,
            lang: document.documentElement.lang,
            scripts: document.querySelectorAll('script').length,
            stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
            images: document.querySelectorAll('img').length,
            forms: document.querySelectorAll('form').length,
            links: document.querySelectorAll('a').length,
          };
        });

        const domEvidenceId = uuidv4();
        evidence.push(evidenceCollector.add(domEvidenceId, 'testing', {
          url,
          viewport: 'desktop',
          snapshot: domSnapshot,
        }));
      } catch {
        // DOM snapshot is best-effort
      }
    }

    // ── Responsive viewport tests ────────────────────────
    for (const vp of VIEWPORTS) {
      if (vp.name === 'desktop') continue; // Already tested desktop

      const vpPage = await context.newPage();
      try {
        await vpPage.setViewportSize({ width: vp.width, height: vp.height });
        await vpPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

        // Take viewport screenshot
        try {
          const vpScreenshot = await vpPage.screenshot({ type: 'png' });
          const vpScreenshotId = uuidv4();
          const vpEvidence = evidenceCollector.add(vpScreenshotId, 'testing', {
            url,
            viewport: vp.name,
            width: vp.width,
            height: vp.height,
            size: vpScreenshot.length,
          });
          vpEvidence.metadata = {
            ...vpEvidence.metadata,
            base64: vpScreenshot.toString('base64'),
          };
          evidence.push(vpEvidence);
        } catch {
          // Screenshot is best-effort
        }

        // Check for horizontal scroll (layout issue)
        const hasHorizontalScroll = await vpPage.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        }).catch(() => false);

        if (hasHorizontalScroll) {
          findings.push(sealFinding({
            severity: 'medium',
            category: 'ux',
            title: `Horizontal scroll on ${vp.name} viewport`,
            description: `The page has horizontal scrolling at ${vp.width}px viewport width. Content may be cut off or users need to scroll sideways.`,
            fix: 'Use responsive design techniques (max-width, flexbox, grid) to prevent horizontal overflow.',
            confidence: 0.85,
          }));
        }

        // Viewport test evidence
        const vpEvidenceId = uuidv4();
        evidence.push(evidenceCollector.add(vpEvidenceId, 'testing', {
          url,
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          hasHorizontalScroll,
        }));
      } catch (err: any) {
        console.error(`Viewport test (${vp.name}) failed:`, err.message);
      } finally {
        await vpPage.close();
      }
    }

    // ── Mixed content check (HTTPS) ──────────────────────
    if (url.startsWith('https://') && !navigationTimeout) {
      try {
        const httpResources = await desktopPage.evaluate(() => {
          const resources = document.querySelectorAll('[src],[href]');
          const httpRefs: string[] = [];
          resources.forEach((el) => {
            const src = el.getAttribute('src') || el.getAttribute('href') || '';
            if (src.startsWith('http://') && !src.startsWith('http://localhost')) {
              httpRefs.push(src);
            }
          });
          return httpRefs;
        }).catch(() => []);

        if (httpResources.length > 0) {
          findings.push(sealFinding({
            severity: 'high',
            category: 'security',
            title: 'Mixed content detected',
            description: `Found ${httpResources.length} HTTP resource(s) loaded from an HTTPS page. Browsers may block these resources.\n${httpResources.slice(0, 5).map((r) => `- ${r}`).join('\n')}`,
            fix: 'Update all resource URLs to use HTTPS.',
            confidence: 0.9,
          }));
        }
      } catch {
        // Mixed content check is best-effort
      }
    }

    await desktopPage.close();
    await context.close();
  } finally {
    await browser.close();
  }

  return { findings, evidence };
}

// ─── HTTP Security Header Checks ───────────────────────────

async function testHttpHeaders(url: string): Promise<BrowserTestResult> {
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

    // HTTP Status
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

    // Redirect Analysis
    if (response.redirected) {
      findings.push(sealFinding({
        severity: 'info',
        category: 'ux',
        title: 'Page redirects',
        description: `The URL redirects to ${response.url}. Verify this redirect is intended.`,
        fix: 'Ensure redirects are necessary and use 301 for permanent moves.',
        confidence: 0.7,
      }));
    }

    // Security Headers
    const headers = response.headers;

    if (!headers.get('x-content-type-options')) {
      findings.push(sealFinding({
        severity: 'medium',
        category: 'security',
        title: 'Missing X-Content-Type-Options header',
        description: 'The response does not include X-Content-Type-Options header, which prevents MIME sniffing attacks.',
        fix: 'Add header: X-Content-Type-Options: nosniff',
        confidence: 0.9,
      }));
    }

    if (!headers.get('x-frame-options') && !headers.get('content-security-policy')) {
      findings.push(sealFinding({
        severity: 'medium',
        category: 'security',
        title: 'Missing clickjacking protection',
        description: 'No X-Frame-Options or CSP frame-ancestors directive found. The site may be vulnerable to clickjacking.',
        fix: 'Add X-Frame-Options: DENY or a CSP frame-ancestors directive.',
        confidence: 0.8,
      }));
    }

    if (url.startsWith('https://') && !headers.get('strict-transport-security')) {
      findings.push(sealFinding({
        severity: 'medium',
        category: 'security',
        title: 'Missing HSTS header',
        description: 'No Strict-Transport-Security header. Users could be downgraded to HTTP via man-in-the-middle attacks.',
        fix: 'Add header: Strict-Transport-Security: max-age=31536000; includeSubDomains',
        confidence: 0.85,
      }));
    }

    if (!headers.get('content-security-policy')) {
      findings.push(sealFinding({
        severity: 'medium',
        category: 'security',
        title: 'Missing Content-Security-Policy header',
        description: 'No CSP header found. The site has no protection against XSS and data injection attacks.',
        fix: 'Implement a Content-Security-Policy header with appropriate directives.',
        confidence: 0.8,
      }));
    }

    if (!headers.get('x-xss-protection')) {
      findings.push(sealFinding({
        severity: 'low',
        category: 'security',
        title: 'Missing X-XSS-Protection header',
        description: 'No X-XSS-Protection header. While deprecated, it provides a fallback for older browsers.',
        fix: 'Add header: X-XSS-Protection: 1; mode=block',
        confidence: 0.6,
      }));
    }

    if (!headers.get('referrer-policy')) {
      findings.push(sealFinding({
        severity: 'low',
        category: 'security',
        title: 'Missing Referrer-Policy header',
        description: 'No Referrer-Policy header. The browser may send full URLs as referrer to external sites.',
        fix: 'Add header: Referrer-Policy: strict-origin-when-cross-origin',
        confidence: 0.7,
      }));
    }

    if (!headers.get('permissions-policy') && !headers.get('feature-policy')) {
      findings.push(sealFinding({
        severity: 'low',
        category: 'security',
        title: 'Missing Permissions-Policy header',
        description: 'No Permissions-Policy header. The site does not restrict browser features like camera, microphone, or geolocation.',
        fix: 'Add a Permissions-Policy header to restrict unnecessary browser features.',
        confidence: 0.6,
      }));
    }

    // Store HTTP response evidence
    const evidenceId = uuidv4();
    evidence.push(storeEvidence(evidenceId, 'network-error', {
      url,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      redirected: response.redirected,
      finalUrl: response.url,
      headers: Object.fromEntries(headers.entries()),
    }));

  } catch (err: any) {
    if (err.name === 'AbortError') {
      findings.push(sealFinding({
        severity: 'high',
        category: 'bug',
        title: 'Connection timeout',
        description: `The URL at ${url} did not respond within 15 seconds.`,
        fix: 'Check if the server is running and accessible. Verify the URL is correct.',
        confidence: 0.95,
      }));
    } else if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
      findings.push(sealFinding({
        severity: 'critical',
        category: 'bug',
        title: 'Connection refused',
        description: `The server at ${url} refused the connection. The server may be down.`,
        fix: 'Verify the server is running and accepting connections on the correct port.',
        confidence: 0.95,
      }));
    } else if (err.cause?.code === 'ENOTFOUND' || err.message?.includes('ENOTFOUND')) {
      findings.push(sealFinding({
        severity: 'critical',
        category: 'bug',
        title: 'DNS resolution failed',
        description: `Could not resolve the hostname for ${url}. The domain may not exist.`,
        fix: 'Verify the URL is correct and the domain is registered.',
        confidence: 0.95,
      }));
    } else if (err.cause?.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || err.message?.includes('certificate')) {
      findings.push(sealFinding({
        severity: 'critical',
        category: 'security',
        title: 'SSL certificate error',
        description: `The SSL certificate for ${url} could not be verified. Users will see a security warning.`,
        fix: 'Renew or fix the SSL certificate. Use a trusted certificate authority.',
        confidence: 0.95,
      }));
    } else {
      findings.push(sealFinding({
        severity: 'critical',
        category: 'bug',
        title: 'URL unreachable',
        description: `Could not connect to ${url}: ${err.message || 'Unknown error'}`,
        fix: 'Verify the URL is correct and the server is accessible from the internet.',
        confidence: 0.95,
      }));
    }
  }

  return { findings, evidence };
}

// ─── Check Common Assets ───────────────────────────────────

async function checkAssets(url: string): Promise<BrowserTestResult> {
  const findings: AuditFinding[] = [];
  const evidence: AuditEvidence[] = [];

  const baseUrl = url.replace(/\/$/, '');
  const assetsToCheck = [
    { path: '/robots.txt', name: 'robots.txt', severity: 'info' as const },
    { path: '/sitemap.xml', name: 'sitemap.xml', severity: 'info' as const },
    { path: '/favicon.ico', name: 'favicon.ico', severity: 'low' as const },
  ];

  for (const asset of assetsToCheck) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${baseUrl}${asset.path}`, {
        signal: controller.signal,
        method: 'HEAD',
        headers: { 'User-Agent': 'WebsiteAuditBot/1.0' },
      });
      clearTimeout(timeout);

      if (response.status === 404) {
        findings.push(sealFinding({
          severity: asset.severity,
          category: asset.severity === 'low' ? 'ux' : 'code-quality',
          title: `Missing ${asset.name}`,
          description: `The ${asset.name} file was not found at ${baseUrl}${asset.path}. ${asset.name === 'robots.txt' ? 'Search engines may not properly crawl the site.' : asset.name === 'sitemap.xml' ? 'A sitemap helps search engines discover pages.' : 'The browser will show a broken icon in the tab.'}`,
          fix: `Add a ${asset.name} file to the root of the website.`,
          confidence: 0.8,
        }));
      }
    } catch {
      // Silently skip failed asset checks
    }
  }

  return { findings, evidence };
}

// ─── Local File Server for Uploaded Files ───────────────────

function createLocalServer(
  rootDir: string,
): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.htm': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
    };

    const server = http.createServer((req, res) => {
      let urlPath = req.url?.split('?')[0] || '/';
      if (urlPath === '/') urlPath = '/index.html';

      const filePath = path.join(rootDir, urlPath);

      // Security: prevent path traversal
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        resolve({ server, port: addr.port });
      } else {
        reject(new Error('Failed to get server port'));
      }
    });

    server.on('error', reject);
  });
}

// ─── Test Local Files with Playwright ──────────────────────

async function testLocalFilesWithPlaywright(
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
  const pw = await loadPlaywright();

  if (!pw) {
    findings.push(sealFinding({
      severity: 'info',
      category: 'code-quality',
      title: 'Playwright not available',
      description: 'Playwright module could not be imported. Falling back to static file analysis only.',
      fix: 'Install Playwright: npm install playwright && npx playwright install chromium',
      confidence: 1.0,
    }));
    return testLocalFilesStatic(job, evidenceCollector);
  }

  const filesDir = path.join(job.workspacePath, 'files');
  if (!fs.existsSync(filesDir)) {
    return { findings, evidence };
  }

  // Find index.html or the first HTML file
  const htmlFile = findIndexHtml(filesDir);
  if (!htmlFile) {
    findings.push(sealFinding({
      severity: 'medium',
      category: 'bug',
      title: 'No HTML entry point found',
      description: 'No index.html or HTML file found in the uploaded files.',
      fix: 'Include an index.html file in the root of your upload.',
      confidence: 0.9,
    }));
    return testLocalFilesStatic(job, evidenceCollector);
  }

  // Start local server
  let serverInfo: { server: http.Server; port: number } | null = null;
  let browser;
  try {
    serverInfo = await createLocalServer(filesDir);
    const localUrl = `http://127.0.0.1:${serverInfo.port}`;

    browser = await launchBrowser(pw);
    if (!browser) {
      findings.push(buildPlaywrightLaunchFailureFinding());
      serverInfo.server.close();
      return { findings, evidence };
    }
    const context = await browser.newContext({ ignoreHTTPSErrors: true });

    const consoleLogs: Array<{ type: string; text: string; url: string; timestamp: number }> = [];

    const page = await context.newPage();
    page.on('console', (msg) => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        url: localUrl,
        timestamp: Date.now(),
      });
    });

    try {
      await page.goto(`${localUrl}/${path.relative(filesDir, htmlFile).replace(/\\/g, '/')}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
    } catch (err: any) {
      findings.push(sealFinding({
        severity: 'high',
        category: 'bug',
        title: 'Local file failed to load',
        description: `Could not load the local HTML file in the browser: ${err.message}`,
        fix: 'Ensure the HTML file and its dependencies are valid.',
        confidence: 0.9,
      }));
      await browser.close();
      serverInfo.server.close();
      return testLocalFilesStatic(job, evidenceCollector);
    }

    // Screenshot
    try {
      const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png' });
      const screenshotId = uuidv4();
      const screenshotEvidence = evidenceCollector.add(screenshotId, 'testing', {
        url: localUrl,
        viewport: 'desktop',
        source: 'uploaded-files',
        size: screenshotBuffer.length,
      });
      screenshotEvidence.metadata = {
        ...screenshotEvidence.metadata,
        base64: screenshotBuffer.toString('base64'),
      };
      evidence.push(screenshotEvidence);
    } catch {
      // Best-effort
    }

    // Console findings
    const consoleErrors = consoleLogs.filter((l) => l.type === 'error');
    if (consoleErrors.length > 0) {
      findings.push(sealFinding({
        severity: 'high',
        category: 'bug',
        title: `${consoleErrors.length} console error(s) in local files`,
        description: `The uploaded files produced ${consoleErrors.length} console error(s):\n${consoleErrors.slice(0, 5).map((e) => `- ${e.text}`).join('\n')}`,
        fix: 'Fix the JavaScript errors in your code.',
        confidence: 0.95,
      }));
    }

    // DOM analysis
    try {
      const domInfo = await page.evaluate(() => ({
        title: document.title,
        lang: document.documentElement.lang,
        viewport: !!document.querySelector('meta[name="viewport"]'),
        images: document.querySelectorAll('img').length,
        imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
        forms: document.querySelectorAll('form').length,
        inputsWithoutLabel: Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])')).filter(
          (input) => !input.id || !document.querySelector(`label[for="${input.id}"]`),
        ).length,
        scripts: document.querySelectorAll('script').length,
        stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
      }));

      if (!domInfo.viewport) {
        findings.push(sealFinding({
          severity: 'high',
          category: 'ux',
          title: 'Missing viewport meta tag',
          description: 'The page does not have a viewport meta tag. It will not render correctly on mobile devices.',
          fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.',
          confidence: 0.95,
          file: path.relative(filesDir, htmlFile).replace(/\\/g, '/'),
        }));
      }

      if (!domInfo.lang) {
        findings.push(sealFinding({
          severity: 'medium',
          category: 'accessibility',
          title: 'Missing lang attribute on <html>',
          description: 'The <html> element does not have a lang attribute. Screen readers cannot identify the page language.',
          fix: 'Add lang="en" (or appropriate language) to the <html> tag.',
          confidence: 0.9,
          file: path.relative(filesDir, htmlFile).replace(/\\/g, '/'),
        }));
      }

      if (domInfo.imagesWithoutAlt > 0) {
        findings.push(sealFinding({
          severity: 'medium',
          category: 'accessibility',
          title: `${domInfo.imagesWithoutAlt} image(s) missing alt text`,
          description: `${domInfo.imagesWithoutAlt} <img> elements are missing the alt attribute.`,
          fix: 'Add alt attributes describing the image content, or alt="" for decorative images.',
          confidence: 0.9,
          file: path.relative(filesDir, htmlFile).replace(/\\/g, '/'),
        }));
      }

      if (domInfo.inputsWithoutLabel > 0) {
        findings.push(sealFinding({
          severity: 'medium',
          category: 'accessibility',
          title: `${domInfo.inputsWithoutLabel} form input(s) without labels`,
          description: `${domInfo.inputsWithoutLabel} form inputs have no associated <label> element.`,
          fix: 'Add <label for="inputId">Label text</label> for each form input.',
          confidence: 0.85,
          file: path.relative(filesDir, htmlFile).replace(/\\/g, '/'),
        }));
      }
    } catch {
      // DOM analysis is best-effort
    }

    await page.close();
    await context.close();
  } finally {
    if (browser) await browser.close();
    if (serverInfo) serverInfo.server.close();
  }

  // Also run static analysis as fallback/supplement
  const staticResult = await testLocalFilesStatic(job, evidenceCollector);
  findings.push(...staticResult.findings);
  evidence.push(...staticResult.evidence);

  return { findings, evidence };
}

// ─── Static File Analysis (Fallback) ───────────────────────

async function testLocalFilesStatic(
  job: {
    id: string;
    inputType: string;
    workspacePath: string;
    mode: string;
  },
  _evidenceCollector: EvidenceCollector,
): Promise<BrowserTestResult> {
  const findings: AuditFinding[] = [];
  const evidence: AuditEvidence[] = [];

  if (job.inputType !== 'files' && job.inputType !== 'bundle') {
    return { findings, evidence };
  }

  const filesDir = path.join(job.workspacePath, 'files');
  if (!fs.existsSync(filesDir)) return { findings, evidence };

  const htmlFiles = findHtmlFiles(filesDir);
  for (const htmlFile of htmlFiles) {
    try {
      const content = fs.readFileSync(htmlFile, 'utf-8');
      const relative = path.relative(filesDir, htmlFile).replace(/\\/g, '/');

      // Broken relative asset references
      const linkRefs = content.match(/(?:src|href)\s*=\s*["']([^"'#]+)["']/gi) || [];
      for (const ref of linkRefs) {
        const refUrl = ref.match(/["']([^"']+)["']/)?.[1];
        if (!refUrl) continue;
        if (refUrl.startsWith('http://') || refUrl.startsWith('https://') || refUrl.startsWith('data:') || refUrl.startsWith('mailto:')) continue;

        const assetPath = path.join(path.dirname(htmlFile), refUrl);
        if (!fs.existsSync(assetPath)) {
          findings.push(sealFinding({
            severity: 'medium',
            category: 'bug',
            title: 'Broken asset reference',
            description: `File "${relative}" references "${refUrl}" which does not exist.`,
            file: relative,
            fix: `Ensure the asset "${refUrl}" exists at the referenced path.`,
            confidence: 0.85,
          }));
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return { findings, evidence };
}

// ─── Main Entry Point: URL / GitHub ────────────────────────

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

  // Always run HTTP header checks
  const headerResult = await testHttpHeaders(targetUrl);
  findings.push(...headerResult.findings);
  evidence.push(...headerResult.evidence);

  // Check common assets
  const assetResult = await checkAssets(targetUrl);
  findings.push(...assetResult.findings);
  evidence.push(...assetResult.evidence);

  // Run Playwright browser tests for recommended/full modes
  if (job.mode === 'recommended' || job.mode === 'full') {
    const browserResult = await testUrlWithPlaywright(targetUrl, evidenceCollector);
    findings.push(...browserResult.findings);
    evidence.push(...browserResult.evidence);
  }

  return { findings, evidence };
}

// ─── Main Entry Point: Local Files ─────────────────────────

export async function testLocalFiles(
  job: {
    id: string;
    inputType: string;
    workspacePath: string;
    mode: string;
  },
  evidenceCollector: EvidenceCollector,
): Promise<BrowserTestResult> {
  // Run Playwright-based testing for recommended/full modes
  if (job.mode === 'recommended' || job.mode === 'full') {
    return testLocalFilesWithPlaywright(job, evidenceCollector);
  }

  // Basic mode: static analysis only
  return testLocalFilesStatic(job, evidenceCollector);
}

// ─── Helpers ───────────────────────────────────────────────

function findHtmlFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue;
      results.push(...findHtmlFiles(fullPath));
    } else if (entry.name.endsWith('.html') || entry.name.endsWith('.htm')) {
      results.push(fullPath);
    }
  }
  return results;
}

function findIndexHtml(dir: string): string | null {
  // Check root first
  const rootIndex = path.join(dir, 'index.html');
  if (fs.existsSync(rootIndex)) return rootIndex;

  // Check for any HTML file
  const htmlFiles = findHtmlFiles(dir);
  return htmlFiles.length > 0 ? htmlFiles[0] : null;
}
