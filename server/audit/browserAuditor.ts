import { v4 as uuidv4 } from 'uuid';
import type { AuditFinding, AuditEvidence } from '../db/auditStore.js';
import { sealFinding } from './codeAnalyzer.js';
import { storeEvidence, type EvidenceCollector } from './evidenceCollector.js';

const fs = await import('fs');
const path = await import('path');

// ─── Types ─────────────────────────────────────────────────

export interface BrowserTestResult {
  findings: AuditFinding[];
  evidence: AuditEvidence[];
}

// ─── Comprehensive HTTP Checks ─────────────────────────────

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

    // ── HTTP Status ───────────────────────────────────────
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

    // ── Redirect Analysis ─────────────────────────────────
    if (response.redirected) {
      const redirectCount = response.url !== url ? 1 : 0;
      findings.push(sealFinding({
        severity: 'info',
        category: 'ux',
        title: 'Page redirects',
        description: `The URL redirects to ${response.url}. ${redirectCount > 0 ? 'Multiple redirects may slow down loading.' : 'Verify this redirect is intended.'}`,
        fix: 'Ensure redirects are necessary and use 301 for permanent moves.',
        confidence: 0.7,
      }));
    }

    // ── Security Headers ──────────────────────────────────
    const headers = response.headers;

    // X-Content-Type-Options
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

    // X-Frame-Options / CSP frame-ancestors
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

    // Strict-Transport-Security
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

    // Content-Security-Policy
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

    // X-XSS-Protection (legacy but still useful)
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

    // Referrer-Policy
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

    // Permissions-Policy
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

    // ── HTML Content Analysis ─────────────────────────────
    const contentType = headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const body = await response.text();

      // Response size
      const sizeKB = body.length / 1024;
      if (sizeKB > 500) {
        findings.push(sealFinding({
          severity: 'medium',
          category: 'performance',
          title: 'Large HTML response',
          description: `The HTML response is ${Math.round(sizeKB)}KB. Large pages load slowly on mobile networks.`,
          fix: 'Reduce page size by lazy-loading content, splitting pages, or optimizing server output.',
          confidence: 0.8,
        }));
      }

      if (sizeKB > 1000) {
        findings.push(sealFinding({
          severity: 'high',
          category: 'performance',
          title: 'Very large HTML response',
          description: `The HTML response is ${Math.round(sizeKB)}KB. This is significantly larger than recommended and will cause slow initial loads.`,
          fix: 'Consider server-side rendering, code splitting, or pagination to reduce HTML payload.',
          confidence: 0.85,
        }));
      }

      // Inline style blocks
      const styleTagCount = (body.match(/<style/gi) || []).length;
      if (styleTagCount > 5) {
        findings.push(sealFinding({
          severity: 'medium',
          category: 'performance',
          title: 'Multiple inline style blocks',
          description: `Found ${styleTagCount} <style> tags. Excessive inline CSS increases page size and prevents caching.`,
          fix: 'Extract CSS into external stylesheets for better caching.',
          confidence: 0.7,
        }));
      }

      // Inline scripts
      const inlineScriptCount = (body.match(/<script[^>]*>/gi) || []).length;
      const externalScripts = (body.match(/<script[^>]*src=/gi) || []).length;
      if (inlineScriptCount > 5) {
        findings.push(sealFinding({
          severity: 'medium',
          category: 'performance',
          title: 'Multiple inline scripts',
          description: `Found ${inlineScriptCount} inline script tags. Inline scripts prevent caching and delay rendering.`,
          fix: 'Move scripts to external files and use defer/async attributes.',
          confidence: 0.7,
        }));
      }

      // Render-blocking scripts in head
      const headMatch = body.match(/<head[^>]*>[\s\S]*?<\/head>/i);
      if (headMatch) {
        const head = headMatch[0];
        const scriptsInHead = (head.match(/<script[^>]*>/gi) || []).filter(
          (s) => !s.includes('defer') && !s.includes('async') && !s.includes('type="module"')
        );
        if (scriptsInHead.length > 0) {
          findings.push(sealFinding({
            severity: 'high',
            category: 'performance',
            title: 'Render-blocking scripts in head',
            description: `Found ${scriptsInHead.length} script(s) in <head> without defer/async. These block page rendering.`,
            fix: 'Add defer or async attributes, or move scripts to the end of <body>.',
            confidence: 0.9,
          }));
        }
      }

      // Missing viewport meta
      if (!body.includes('viewport')) {
        findings.push(sealFinding({
          severity: 'high',
          category: 'ux',
          title: 'Missing viewport meta tag',
          description: 'No viewport meta tag found in the HTML response. The site will not render correctly on mobile devices.',
          fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.',
          confidence: 0.95,
        }));
      }

      // Missing charset
      if (!body.includes('charset') && !body.includes('encoding=')) {
        findings.push(sealFinding({
          severity: 'low',
          category: 'code-quality',
          title: 'Missing charset declaration',
          description: 'No charset meta tag found. The browser may misinterpret text encoding.',
          fix: 'Add <meta charset="UTF-8"> as the first tag in <head>.',
          confidence: 0.8,
        }));
      }

      // Missing lang attribute
      if (body.includes('<html') && !body.match(/<html[^>]*\slang\s*=/i)) {
        findings.push(sealFinding({
          severity: 'medium',
          category: 'accessibility',
          title: 'Missing lang attribute on <html>',
          description: 'The <html> element does not have a lang attribute. Screen readers cannot identify the page language.',
          fix: 'Add lang="en" (or appropriate language) to the <html> tag.',
          confidence: 0.9,
        }));
      }

      // Missing title
      if (!body.match(/<title[^>]*>[^<]+<\/title>/i)) {
        findings.push(sealFinding({
          severity: 'medium',
          category: 'code-quality',
          title: 'Missing or empty <title> tag',
          description: 'No meaningful title tag found. This affects SEO and browser tab identification.',
          fix: 'Add a descriptive <title> element inside <head>.',
          confidence: 0.9,
        }));
      }

      // Images without alt
      const imgTags = body.match(/<img[^>]*>/gi) || [];
      const imgsWithoutAlt = imgTags.filter((tag) => !tag.match(/alt\s*=/i));
      if (imgsWithoutAlt.length > 0) {
        findings.push(sealFinding({
          severity: 'medium',
          category: 'accessibility',
          title: `${imgsWithoutAlt.length} image(s) missing alt text`,
          description: `${imgsWithoutAlt.length} <img> elements are missing the alt attribute. Screen readers cannot describe these images.`,
          fix: 'Add alt attributes describing the image content, or alt="" for decorative images.',
          confidence: 0.9,
        }));
      }

      // Form inputs without labels
      const inputTags = body.match(/<input[^>]*>/gi) || [];
      const inputsWithoutLabel = inputTags.filter((tag) => {
        if (tag.includes('type="hidden"') || tag.includes('type="submit"') || tag.includes('type="button"')) return false;
        const idMatch = tag.match(/id\s*=\s*["']([^"']+)["']/);
        if (!idMatch) return true;
        return !body.includes(`for="${idMatch[1]}"`);
      });
      if (inputsWithoutLabel.length > 0) {
        findings.push(sealFinding({
          severity: 'medium',
          category: 'accessibility',
          title: `${inputsWithoutLabel.length} form input(s) without labels`,
          description: `${inputsWithoutLabel.length} form inputs have no associated <label> element.`,
          fix: 'Add <label for="inputId">Label text</label> for each form input.',
          confidence: 0.85,
        }));
      }

      // Store evidence
      const evidenceId = uuidv4();
      evidence.push(storeEvidence(evidenceId, 'dom-snapshot', {
        url,
        status: response.status,
        contentType: response.headers.get('content-type'),
        responseSize: sizeKB,
        inlineStyles: styleTagCount,
        inlineScripts: inlineScriptCount,
        externalScripts,
        images: imgTags.length,
        imagesWithoutAlt: imgsWithoutAlt.length,
        inputs: inputTags.length,
        inputsWithoutLabel: inputsWithoutLabel.length,
      }));
    }

    // ── Non-HTML Content Checks ───────────────────────────
    if (!contentType.includes('text/html') && !contentType.includes('application/json')) {
      findings.push(sealFinding({
        severity: 'info',
        category: 'code-quality',
        title: 'Non-HTML content type',
        description: `The URL returns ${contentType || 'unknown content type'} instead of text/html.`,
        fix: 'Ensure the URL points to an HTML page, not an API endpoint or asset.',
        confidence: 0.6,
      }));
    }

    // ── Store HTTP evidence ───────────────────────────────
    const httpEvidenceId = uuidv4();
    evidence.push(storeEvidence(httpEvidenceId, 'network-error', {
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

// ─── Check for Mixed Content ───────────────────────────────

async function checkMixedContent(url: string): Promise<BrowserTestResult> {
  const findings: AuditFinding[] = [];
  const evidence: AuditEvidence[] = [];

  if (!url.startsWith('https://')) return { findings, evidence };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'WebsiteAuditBot/1.0' },
    });
    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const body = await response.text();

      // Check for HTTP resources loaded from HTTPS page
      const httpResources = body.match(/(src|href|action)\s*=\s*["']http:\/\//gi) || [];
      if (httpResources.length > 0) {
        findings.push(sealFinding({
          severity: 'high',
          category: 'security',
          title: 'Mixed content detected',
          description: `Found ${httpResources.length} HTTP resource(s) loaded from an HTTPS page. Browsers may block these resources.`,
          fix: 'Update all resource URLs to use HTTPS.',
          confidence: 0.9,
        }));
      }
    }
  } catch {
    // Silently skip
  }

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

    // Check common assets
    const assetResult = await checkAssets(targetUrl);
    findings.push(...assetResult.findings);
    evidence.push(...assetResult.evidence);

    // Check mixed content for HTTPS
    if (targetUrl.startsWith('https://')) {
      const mixedResult = await checkMixedContent(targetUrl);
      findings.push(...mixedResult.findings);
      evidence.push(...mixedResult.evidence);
    }
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

  // For uploaded files, we can analyze the HTML content directly
  if (job.inputType === 'files' || job.inputType === 'bundle') {
    const filesDir = path.join(job.workspacePath, 'files');
    if (fs.existsSync(filesDir)) {
      const htmlFiles = findHtmlFiles(filesDir);
      for (const htmlFile of htmlFiles) {
        try {
          const content = fs.readFileSync(htmlFile, 'utf-8');
          const relative = path.relative(filesDir, htmlFile).replace(/\\/g, '/');

          // Check viewport meta
          if (!content.includes('viewport')) {
            findings.push(sealFinding({
              severity: 'high',
              category: 'ux',
              title: 'Missing viewport meta tag',
              description: `File "${relative}" does not have a viewport meta tag. The site will not render correctly on mobile.`,
              file: relative,
              fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.',
              confidence: 0.95,
            }));
          }

          // Check lang attribute
          if (content.includes('<html') && !content.match(/<html[^>]*\slang\s*=/i)) {
            findings.push(sealFinding({
              severity: 'medium',
              category: 'accessibility',
              title: 'Missing lang attribute on <html>',
              description: `File "${relative}" does not have a lang attribute on the <html> element.`,
              file: relative,
              fix: 'Add lang="en" (or appropriate language) to the <html> tag.',
              confidence: 0.9,
            }));
          }

          // Check images without alt
          const imgTags = content.match(/<img[^>]*>/gi) || [];
          const imgsWithoutAlt = imgTags.filter((tag) => !tag.match(/alt\s*=/i));
          if (imgsWithoutAlt.length > 0) {
            findings.push(sealFinding({
              severity: 'medium',
              category: 'accessibility',
              title: `${imgsWithoutAlt.length} image(s) missing alt text`,
              description: `${imgsWithoutAlt.length} <img> elements in "${relative}" are missing the alt attribute.`,
              file: relative,
              fix: 'Add alt attributes describing the image content.',
              confidence: 0.9,
            }));
          }

          // Check for broken links (relative)
          const linkRefs = content.match(/(?:src|href)\s*=\s*["']([^"'#]+)["']/gi) || [];
          for (const ref of linkRefs) {
            const url = ref.match(/["']([^"']+)["']/)?.[1];
            if (!url) continue;
            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('mailto:')) continue;

            const assetPath = path.join(path.dirname(htmlFile), url);
            if (!fs.existsSync(assetPath)) {
              findings.push(sealFinding({
                severity: 'medium',
                category: 'bug',
                title: 'Broken asset reference',
                description: `File "${relative}" references "${url}" which does not exist.`,
                file: relative,
                fix: `Ensure the asset "${url}" exists at the referenced path.`,
                confidence: 0.85,
              }));
            }
          }

          // Check form inputs without labels
          const inputTags = content.match(/<input[^>]*>/gi) || [];
          const inputsWithoutLabel = inputTags.filter((tag) => {
            if (tag.includes('type="hidden"') || tag.includes('type="submit"') || tag.includes('type="button"')) return false;
            const idMatch = tag.match(/id\s*=\s*["']([^"']+)["']/);
            if (!idMatch) return true;
            return !content.includes(`for="${idMatch[1]}"`);
          });
          if (inputsWithoutLabel.length > 0) {
            findings.push(sealFinding({
              severity: 'medium',
              category: 'accessibility',
              title: `${inputsWithoutLabel.length} form input(s) without labels`,
              description: `${inputsWithoutLabel.length} form inputs in "${relative}" have no associated <label>.`,
              file: relative,
              fix: 'Add <label for="inputId">Label text</label> for each form input.',
              confidence: 0.85,
            }));
          }
        } catch {
          // Skip unreadable files
        }
      }
    }

    findings.push(sealFinding({
      severity: 'info',
      category: 'code-quality',
      title: 'Uploaded files analyzed',
      description: 'Static analysis was performed on uploaded files. For full browser testing, deploy the files to a URL.',
      fix: 'Deploy the files to a public URL and submit that for browser-based testing.',
      confidence: 1.0,
    }));
  }

  return { findings, evidence };
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
