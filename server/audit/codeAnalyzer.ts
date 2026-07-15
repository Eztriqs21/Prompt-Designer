import { v4 as uuidv4 } from 'uuid';
import type { AuditFinding, Severity, FindingCategory } from '../db/auditStore.js';

const fs = await import('fs');
const path = await import('path');

// ─── Finding Factory ───────────────────────────────────────

export function sealFinding(partial: {
  severity: Severity;
  category: FindingCategory;
  title: string;
  description: string;
  file?: string;
  line?: number;
  evidence?: string;
  fix?: string;
  confidence?: number;
}): AuditFinding {
  return {
    id: uuidv4(),
    severity: partial.severity,
    category: partial.category,
    title: partial.title,
    description: partial.description,
    file: partial.file,
    line: partial.line,
    evidence: partial.evidence,
    fix: partial.fix,
    confidence: partial.confidence ?? 0.8,
  };
}

// ─── Main Entry ────────────────────────────────────────────

export async function analyzeCode(workspacePath: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  const files = readDirRecursive(workspacePath);

  for (const filePath of files) {
    const relativePath = path.relative(workspacePath, filePath);
    const ext = path.extname(filePath).toLowerCase();

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      if (ext === '.html' || ext === '.htm') {
        findings.push(...analyzeHtml(content, relativePath));
      } else if (ext === '.css') {
        findings.push(...analyzeCss(content, relativePath));
      } else if (ext === '.js' || ext === '.ts' || ext === '.jsx' || ext === '.tsx') {
        findings.push(...analyzeJs(content, relativePath));
      } else if (ext === '.json' && relativePath === 'package.json') {
        findings.push(...analyzePackageJson(content, relativePath, workspacePath));
      }
    } catch {
      // Skip files that can't be read
    }
  }

  // Check for missing assets
  findings.push(...checkMissingAssets(workspacePath, files));

  return findings;
}

// ─── HTML Analysis ─────────────────────────────────────────

function analyzeHtml(content: string, file: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const lines = content.split('\n');

  // Check for missing doctype
  if (!content.toLowerCase().includes('<!doctype html>')) {
    findings.push(sealFinding({
      severity: 'medium',
      category: 'code-quality',
      title: 'Missing DOCTYPE declaration',
      description: 'HTML file does not include a DOCTYPE declaration. This can cause browsers to render in quirks mode.',
      file,
      fix: 'Add <!DOCTYPE html> at the beginning of the HTML file.',
      confidence: 0.9,
    }));
  }

  // Check for missing viewport meta tag
  if (!content.includes('viewport')) {
    findings.push(sealFinding({
      severity: 'high',
      category: 'ux',
      title: 'Missing viewport meta tag',
      description: 'No viewport meta tag found. The site will not render correctly on mobile devices.',
      file,
      fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.',
      confidence: 0.95,
    }));
  }

  // Check for missing lang attribute
  if (content.includes('<html') && !content.match(/<html[^>]*\slang\s*=/i)) {
    findings.push(sealFinding({
      severity: 'low',
      category: 'accessibility',
      title: 'Missing lang attribute on <html>',
      description: 'The <html> element does not have a lang attribute, which helps screen readers identify the page language.',
      file,
      fix: 'Add lang="en" (or appropriate language) to the <html> tag.',
      confidence: 0.9,
    }));
  }

  // Check for images without alt text
  const imgRegex = /<img[^>]*>/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(content)) !== null) {
    if (!imgMatch[0].match(/alt\s*=/i)) {
      const lineNum = content.substring(0, imgMatch.index).split('\n').length;
      findings.push(sealFinding({
        severity: 'medium',
        category: 'accessibility',
        title: 'Image missing alt text',
        description: 'An <img> element is missing the alt attribute. Screen readers cannot describe this image to users.',
        file,
        line: lineNum,
        fix: 'Add an alt attribute describing the image content, or alt="" for decorative images.',
        confidence: 0.95,
      }));
    }
  }

  // Check for missing title tag
  if (!content.match(/<title[^>]*>[^<]+<\/title>/i)) {
    findings.push(sealFinding({
      severity: 'medium',
      category: 'code-quality',
      title: 'Missing or empty <title> tag',
      description: 'The HTML file does not have a meaningful title tag. This affects SEO and browser tab identification.',
      file,
      fix: 'Add a descriptive <title> element inside <head>.',
      confidence: 0.9,
    }));
  }

  // Check for missing meta description
  if (!content.includes('meta') || !content.match(/name\s*=\s*["']description["']/i)) {
    findings.push(sealFinding({
      severity: 'low',
      category: 'code-quality',
      title: 'Missing meta description',
      description: 'No meta description found. Search engines will auto-generate one, which may not match your intent.',
      file,
      fix: 'Add <meta name="description" content="..."> to the <head>.',
      confidence: 0.7,
    }));
  }

  // Check for inline styles (anti-pattern)
  const inlineStyleCount = (content.match(/style\s*=\s*["'][^"']*["']/gi) || []).length;
  if (inlineStyleCount > 5) {
    findings.push(sealFinding({
      severity: 'low',
      category: 'code-quality',
      title: 'Excessive inline styles detected',
      description: `Found ${inlineStyleCount} inline style attributes. This hurts maintainability and makes styling harder to manage.`,
      file,
      fix: 'Extract inline styles to CSS classes or a CSS module.',
      confidence: 0.7,
    }));
  }

  // Check for script tags in head without defer/async
  const headSection = content.match(/<head[^>]*>[\s\S]*?<\/head>/i)?.[0] || '';
  const scriptsInHead = headSection.match(/<script[^>]*>/gi) || [];
  for (const scriptTag of scriptsInHead) {
    if (!scriptTag.includes('defer') && !scriptTag.includes('async') && !scriptTag.includes('type="module"')) {
      findings.push(sealFinding({
        severity: 'medium',
        category: 'performance',
        title: 'Render-blocking script in <head>',
        description: 'A <script> tag in <head> without defer/async blocks page rendering.',
        file,
        fix: 'Add defer or async attribute to the script tag, or move it to the end of <body>.',
        confidence: 0.85,
      }));
    }
  }

  return findings;
}

// ─── CSS Analysis ──────────────────────────────────────────

function analyzeCss(content: string, file: string): AuditFinding[] {
  const findings: AuditFinding[] = [];

  // Check for !important overuse
  const importantCount = (content.match(/!important/g) || []).length;
  if (importantCount > 10) {
    findings.push(sealFinding({
      severity: 'medium',
      category: 'code-quality',
      title: 'Excessive !important usage',
      description: `Found ${importantCount} !important declarations. Overuse of !important makes CSS harder to maintain and override.`,
      file,
      fix: 'Refactor CSS to reduce reliance on !important. Use more specific selectors instead.',
      confidence: 0.8,
    }));
  }

  // Check for universal selector
  if (content.match(/\*\s*\{/)) {
    findings.push(sealFinding({
      severity: 'low',
      category: 'performance',
      title: 'Universal selector usage',
      description: 'The CSS uses the * selector which applies to all elements and can impact performance.',
      file,
      fix: 'Replace * with specific element selectors where possible.',
      confidence: 0.6,
    }));
  }

  // Check for !important in media queries (responsive issues)
  const mediaQueries = content.match(/@media[^{]*\{/g) || [];
  if (mediaQueries.length === 0 && content.length > 500) {
    findings.push(sealFinding({
      severity: 'high',
      category: 'ux',
      title: 'No media queries found',
      description: 'No @media queries detected. The site may not be responsive on different screen sizes.',
      file,
      fix: 'Add responsive breakpoints using @media queries.',
      confidence: 0.75,
    }));
  }

  // Check for z-index wars
  const highZIndex = content.match(/z-index\s*:\s*(\d+)/gi) || [];
  const zValues = highZIndex.map((m) => parseInt(m.replace(/[^0-9]/g, '')));
  const maxZ = Math.max(...zValues, 0);
  if (maxZ > 9999) {
    findings.push(sealFinding({
      severity: 'medium',
      category: 'code-quality',
      title: 'Extremely high z-index value',
      description: `Found z-index value of ${maxZ}. Very high z-index values indicate a z-index management problem.`,
      file,
      fix: 'Use a consistent z-index scale and avoid values above 1000.',
      confidence: 0.8,
    }));
  }

  return findings;
}

// ─── JavaScript/TypeScript Analysis ────────────────────────

function analyzeJs(content: string, file: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const lines = content.split('\n');

  // Check for console.log statements
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/console\.(log|debug|info)\s*\(/)) {
      findings.push(sealFinding({
        severity: 'low',
        category: 'code-quality',
        title: 'Debug console statement found',
        description: 'console.log/debug/info statements should be removed before production.',
        file,
        line: i + 1,
        fix: 'Remove console.log statements or use a proper logging library.',
        confidence: 0.9,
      }));
      break; // Only report once per file
    }
  }

  // Check for TODO/FIXME/HACK comments
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/\/\/\s*(TODO|FIXME|HACK|XXX)\b/)) {
      findings.push(sealFinding({
        severity: 'info',
        category: 'code-quality',
        title: 'Unresolved TODO/FIXME comment',
        description: `Found "${line.trim().substring(0, 80)}" — this indicates unfinished work.`,
        file,
        line: i + 1,
        fix: 'Address the TODO/FIXME or remove the comment.',
        confidence: 0.9,
      }));
      break; // Only report once per file
    }
  }

  // Check for eval() usage
  if (content.match(/\beval\s*\(/)) {
    findings.push(sealFinding({
      severity: 'critical',
      category: 'security',
      title: 'eval() usage detected',
      description: 'eval() executes arbitrary code and is a major security risk. It also prevents engine optimizations.',
      file,
      fix: 'Replace eval() with safer alternatives like JSON.parse() or Function constructor.',
      confidence: 0.95,
    }));
  }

  // Check for innerHTML usage
  if (content.match(/\.innerHTML\s*=/)) {
    findings.push(sealFinding({
      severity: 'high',
      category: 'security',
      title: 'innerHTML assignment detected',
      description: 'Direct innerHTML assignment can lead to XSS vulnerabilities if user input is involved.',
      file,
      fix: 'Use textContent for plain text, or sanitize HTML before inserting.',
      confidence: 0.85,
    }));
  }

  // Check for document.write
  if (content.match(/document\.write\s*\(/)) {
    findings.push(sealFinding({
      severity: 'high',
      category: 'bug',
      title: 'document.write() usage detected',
      description: 'document.write() can overwrite the entire page if called after load and is considered an anti-pattern.',
      file,
      fix: 'Use DOM manipulation methods (createElement, appendChild, etc.) instead.',
      confidence: 0.9,
    }));
  }

  // Check for missing error handling in async functions
  const asyncFns = content.match(/async\s+(function|\([^)]*\)\s*=>|[\w]+\s*\([^)]*\)\s*=>)/g) || [];
  if (asyncFns.length > 3) {
    const tryCatchCount = (content.match(/try\s*\{/g) || []).length;
    if (tryCatchCount === 0) {
      findings.push(sealFinding({
        severity: 'medium',
        category: 'bug',
        title: 'Async functions without try/catch',
        description: `Found ${asyncFns.length} async functions but no try/catch blocks. Unhandled promise rejections may crash the app.`,
        file,
        fix: 'Wrap async operations in try/catch blocks or add .catch() handlers.',
        confidence: 0.7,
      }));
    }
  }

  // Check for var usage
  const varCount = (content.match(/\bvar\s+/g) || []).length;
  if (varCount > 0) {
    findings.push(sealFinding({
      severity: 'low',
      category: 'code-quality',
      title: 'var keyword usage',
      description: `Found ${varCount} uses of 'var'. Use 'const' or 'let' for better scoping.`,
      file,
      fix: 'Replace var with const (preferred) or let.',
      confidence: 0.8,
    }));
  }

  // Check for == instead of ===
  const looseEquality = (content.match(/[^=!]==[^=]/g) || []).length;
  if (looseEquality > 3) {
    findings.push(sealFinding({
      severity: 'low',
      category: 'code-quality',
      title: 'Loose equality (==) usage',
      description: `Found ${looseEquality} uses of ==. Loose equality can cause unexpected type coercion bugs.`,
      file,
      fix: 'Use strict equality (===) instead.',
      confidence: 0.7,
    }));
  }

  return findings;
}

// ─── Package.json Analysis ─────────────────────────────────

function analyzePackageJson(content: string, file: string, workspacePath: string): AuditFinding[] {
  const findings: AuditFinding[] = [];

  try {
    const pkg = JSON.parse(content);

    // Check for missing scripts
    if (!pkg.scripts || Object.keys(pkg.scripts).length === 0) {
      findings.push(sealFinding({
        severity: 'low',
        category: 'code-quality',
        title: 'No npm scripts defined',
        description: 'package.json has no scripts. Common scripts like build, dev, and test are missing.',
        file,
        fix: 'Add standard scripts: "dev", "build", "start", "test".',
        confidence: 0.7,
      }));
    }

    // Check for missing lock file
    const lockExists = fs.existsSync(path.join(workspacePath, 'package-lock.json')) ||
                       fs.existsSync(path.join(workspacePath, 'yarn.lock')) ||
                       fs.existsSync(path.join(workspacePath, 'pnpm-lock.yaml'));
    if (!lockExists && pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
      findings.push(sealFinding({
        severity: 'medium',
        category: 'bug',
        title: 'Missing lock file',
        description: 'No package-lock.json, yarn.lock, or pnpm-lock.yaml found. Dependencies may install inconsistently.',
        file,
        fix: 'Run npm install or yarn install to generate a lock file.',
        confidence: 0.9,
      }));
    }

    // Check for outdated engines field
    if (!pkg.engines) {
      findings.push(sealFinding({
        severity: 'info',
        category: 'code-quality',
        title: 'No engines field in package.json',
        description: 'No Node.js version requirement specified. This can cause compatibility issues.',
        file,
        fix: 'Add an "engines" field specifying the required Node.js version.',
        confidence: 0.5,
      }));
    }
  } catch {
    findings.push(sealFinding({
      severity: 'medium',
      category: 'bug',
      title: 'Invalid package.json',
      description: 'package.json contains invalid JSON and cannot be parsed.',
      file,
      fix: 'Fix the JSON syntax errors in package.json.',
      confidence: 0.95,
    }));
  }

  return findings;
}

// ─── Missing Assets Check ──────────────────────────────────

function checkMissingAssets(workspacePath: string, allFiles: string[]): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const relativeFiles = new Set(allFiles.map((f) => path.relative(workspacePath, f).replace(/\\/g, '/')));

  // Check HTML files for missing referenced assets
  const htmlFiles = allFiles.filter((f) => f.endsWith('.html') || f.endsWith('.htm'));
  for (const htmlFile of htmlFiles) {
    try {
      const content = fs.readFileSync(htmlFile, 'utf-8');
      const relative = path.relative(workspacePath, htmlFile).replace(/\\/g, '/');

      // Check src/href references
      const srcRefs = content.match(/(?:src|href)\s*=\s*["']([^"'#?]+)["']/gi) || [];
      for (const ref of srcRefs) {
        const url = ref.match(/["']([^"']+)["']/)?.[1];
        if (!url) continue;
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('mailto:')) continue;

        // Normalize path
        const assetPath = path.join(path.dirname(relative), url).replace(/\\/g, '/');
        const normalizedAsset = path.normalize(assetPath).replace(/\\/g, '/');

        // Check if file exists
        if (!relativeFiles.has(normalizedAsset) && !relativeFiles.has(assetPath)) {
          findings.push(sealFinding({
            severity: 'medium',
            category: 'bug',
            title: 'Missing referenced asset',
            description: `File "${relative}" references "${url}" which does not exist in the project.`,
            file: relative,
            fix: `Ensure the asset "${url}" exists at the referenced path, or update the reference.`,
            confidence: 0.85,
          }));
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return findings;
}

// ─── Helpers ───────────────────────────────────────────────

function readDirRecursive(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'evidence'].includes(entry.name)) continue;
      results.push(...readDirRecursive(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}
