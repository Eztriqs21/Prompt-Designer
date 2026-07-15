import type { AuditFinding } from '../db/auditStore.js';
import { sealFinding } from './codeAnalyzer.js';

const fs = await import('fs');
const path = await import('path');

// ─── Main Entry ────────────────────────────────────────────

export async function runAccessibilityChecks(workspacePath: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  const files = readDirRecursive(workspacePath);

  for (const filePath of files) {
    const relativePath = path.relative(workspacePath, filePath).replace(/\\/g, '/');
    const ext = path.extname(filePath).toLowerCase();

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      if (ext === '.html' || ext === '.htm') {
        findings.push(...checkHtmlAccessibility(content, relativePath));
      } else if (ext === '.css') {
        findings.push(...checkCssAccessibility(content, relativePath));
      } else if (ext === '.jsx' || ext === '.tsx') {
        findings.push(...checkReactAccessibility(content, relativePath));
      }
    } catch {
      // Skip unreadable files
    }
  }

  return findings;
}

export async function runPerformanceChecks(workspacePath: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  const files = readDirRecursive(workspacePath);

  for (const filePath of files) {
    const relativePath = path.relative(workspacePath, filePath).replace(/\\/g, '/');
    const ext = path.extname(filePath).toLowerCase();

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      if (ext === '.html' || ext === '.htm') {
        findings.push(...checkHtmlPerformance(content, relativePath, workspacePath));
      } else if (ext === '.css') {
        findings.push(...checkCssPerformance(content, relativePath));
      } else if (ext === '.js' || ext === '.ts' || ext === '.jsx' || ext === '.tsx') {
        findings.push(...checkJsPerformance(content, relativePath));
      }
    } catch {
      // Skip unreadable files
    }
  }

  return findings;
}

// ─── HTML Accessibility ────────────────────────────────────

function checkHtmlAccessibility(content: string, file: string): AuditFinding[] {
  const findings: AuditFinding[] = [];

  // Check heading hierarchy
  const headings: number[] = [];
  const headingRegex = /<h([1-6])[^>]*>/gi;
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push(parseInt(match[1]));
  }

  if (headings.length > 0) {
    // Check if h1 is present
    if (!headings.includes(1)) {
      findings.push(sealFinding({
        severity: 'medium',
        category: 'accessibility',
        title: 'Missing <h1> heading',
        description: 'No <h1> heading found. Every page should have exactly one <h1> for screen reader navigation.',
        file,
        fix: 'Add a <h1> heading that describes the page content.',
        confidence: 0.9,
      }));
    }

    // Check for skipped heading levels
    for (let i = 1; i < headings.length; i++) {
      if (headings[i] - headings[i - 1] > 1) {
        findings.push(sealFinding({
          severity: 'medium',
          category: 'accessibility',
          title: 'Heading level skipped',
          description: `Heading level jumps from <h${headings[i - 1]}> to <h${headings[i]}>, skipping levels. This breaks screen reader navigation.`,
          file,
          fix: 'Ensure headings increase by one level at a time (h1 → h2 → h3).',
          confidence: 0.9,
        }));
        break;
      }
    }
  }

  // Check form labels
  const inputRegex = /<input[^>]*>/gi;
  while ((match = inputRegex.exec(content)) !== null) {
    const inputTag = match[0];
    // Skip hidden and submit inputs
    if (inputTag.includes('type="hidden"') || inputTag.includes('type="submit"') || inputTag.includes('type="button"')) continue;

    const idMatch = inputTag.match(/id\s*=\s*["']([^"']+)["']/);
    if (idMatch) {
      const id = idMatch[1];
      // Check for associated label
      if (!content.includes(`for="${id}"`) && !content.includes(`for='${id}'`)) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        findings.push(sealFinding({
          severity: 'medium',
          category: 'accessibility',
          title: 'Form input without associated label',
          description: `Input with id="${id}" has no associated <label> element. Screen readers cannot identify this field.`,
          file,
          line: lineNum,
          fix: `Add <label for="${id}">Label text</label> for this input.`,
          confidence: 0.9,
        }));
      }
    }
  }

  // Check for skip navigation link
  if (!content.includes('skip') || !content.match(/skip\s*(to)?\s*(main|content|nav)/i)) {
    const hasNav = content.includes('<nav') || content.includes('role="navigation"');
    if (hasNav) {
      findings.push(sealFinding({
        severity: 'low',
        category: 'accessibility',
        title: 'No skip navigation link',
        description: 'Navigation found but no skip link. Keyboard users must tab through all navigation items to reach content.',
        file,
        fix: 'Add a skip navigation link as the first focusable element: <a href="#main" class="skip-link">Skip to content</a>',
        confidence: 0.7,
      }));
    }
  }

  // Check ARIA landmarks
  const hasLandmarks = content.includes('role="banner"') ||
    content.includes('role="navigation"') ||
    content.includes('role="main"') ||
    content.includes('role="contentinfo"') ||
    content.includes('<header') ||
    content.includes('<nav') ||
    content.includes('<main') ||
    content.includes('<footer');

  if (!hasLandmarks && content.length > 500) {
    findings.push(sealFinding({
      severity: 'medium',
      category: 'accessibility',
      title: 'No ARIA landmarks found',
      description: 'No semantic HTML5 landmarks or ARIA roles found. Screen readers use landmarks for page navigation.',
      file,
      fix: 'Use semantic elements: <header>, <nav>, <main>, <footer>, or add ARIA roles.',
      confidence: 0.8,
    }));
  }

  // Check for focus styles
  if (content.includes('outline: none') || content.includes('outline: 0')) {
    findings.push(sealFinding({
      severity: 'high',
      category: 'accessibility',
      title: 'Focus outline removed',
      description: 'CSS removes the focus outline, making it impossible for keyboard users to see which element is focused.',
      file,
      fix: 'Never remove focus outlines without providing an alternative focus style.',
      confidence: 0.9,
    }));
  }

  return findings;
}

// ─── CSS Accessibility ─────────────────────────────────────

function checkCssAccessibility(content: string, file: string): AuditFinding[] {
  const findings: AuditFinding[] = [];

  // Check for color contrast indicators
  const colorRegex = /(?:color|background-color|border-color)\s*:\s*([^;}{]+)/gi;
  const colors: string[] = [];
  while ((match = colorRegex.exec(content)) !== null) {
    colors.push(match[1].trim());
  }

  // Check for low contrast patterns
  if (content.includes('color: #fff') && content.includes('background-color: #fff')) {
    findings.push(sealFinding({
      severity: 'critical',
      category: 'accessibility',
      title: 'White text on white background',
      description: 'CSS sets both text and background to white, making content invisible.',
      file,
      fix: 'Ensure sufficient contrast between text and background colors.',
      confidence: 0.95,
    }));
  }

  // Check for reduced motion
  if (content.includes('animation') && !content.includes('prefers-reduced-motion')) {
    findings.push(sealFinding({
      severity: 'medium',
      category: 'accessibility',
      title: 'Animations without reduced motion support',
      description: 'CSS uses animations but does not respect prefers-reduced-motion. Users who are sensitive to motion cannot disable animations.',
      file,
      fix: 'Add @media (prefers-reduced-motion: reduce) { ... } to disable or reduce animations.',
      confidence: 0.8,
    }));
  }

  return findings;
}

// ─── React Accessibility ───────────────────────────────────

function checkReactAccessibility(content: string, file: string): AuditFinding[] {
  const findings: AuditFinding[] = [];

  // Check for anchor tags with href="#"
  if (content.match(/<a\s+[^>]*href\s*=\s*["']#/)) {
    findings.push(sealFinding({
      severity: 'low',
      category: 'accessibility',
      title: 'Anchor with href="#" found',
      description: 'An <a> tag has href="#" which causes page scroll to top and may confuse screen readers.',
      file,
      fix: 'Use a <button> element for click handlers instead of <a href="#">.',
      confidence: 0.8,
    }));
  }

  // Check for onClick on non-interactive elements
  const onClickRegex = /onClick\s*=\s*\{[^}]*\}/g;
  while ((match = onClickRegex.exec(content)) !== null) {
    const before = content.substring(Math.max(0, match.index - 200), match.index);
    if (before.match(/<(div|span|p|section|article)\s*[^>]*$/i)) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      findings.push(sealFinding({
        severity: 'medium',
        category: 'accessibility',
        title: 'onClick on non-interactive element',
        description: 'An onClick handler is on a non-interactive element (div/span/p). This is not keyboard accessible.',
        file,
        line: lineNum,
        fix: 'Use a <button> or add role="button" tabIndex={0} and onKeyDown handler.',
        confidence: 0.85,
      }));
    }
  }

  // Check for img without alt
  const imgRegex = /<img[^>]*(?<!alt\s*=\s*["'][^"']*)>/gi;
  while ((match = imgRegex.exec(content)) !== null) {
    if (!match[0].includes('alt=')) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      findings.push(sealFinding({
        severity: 'medium',
        category: 'accessibility',
        title: 'Image without alt prop',
        description: 'A React <img> element is missing the alt prop. This is required for accessibility.',
        file,
        line: lineNum,
        fix: 'Add an alt prop describing the image content.',
        confidence: 0.9,
      }));
    }
  }

  return findings;
}

// ─── HTML Performance ──────────────────────────────────────

function checkHtmlPerformance(content: string, file: string, workspacePath: string): AuditFinding[] {
  const findings: AuditFinding[] = [];

  // Check for render-blocking CSS
  const cssLinks = content.match(/<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi) || [];
  if (cssLinks.length > 4) {
    findings.push(sealFinding({
      severity: 'medium',
      category: 'performance',
      title: 'Multiple render-blocking stylesheets',
      description: `Found ${cssLinks.length} stylesheet links. Each one blocks page rendering.`,
      file,
      fix: 'Combine CSS files or use media attributes to load non-critical CSS asynchronously.',
      confidence: 0.8,
    }));
  }

  // Check for large inline scripts
  const scriptTags = content.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const script of scriptTags) {
    if (script.length > 50000) {
      findings.push(sealFinding({
        severity: 'high',
        category: 'performance',
        title: 'Large inline script',
        description: `An inline script is ${Math.round(script.length / 1024)}KB. Large inline scripts slow down initial page load.`,
        file,
        fix: 'Move the script to an external file for better caching and parallel loading.',
        confidence: 0.85,
      }));
    }
  }

  // Check for preload/prefetch hints
  if (!content.includes('preload') && !content.includes('prefetch')) {
    const hasHeavyAssets = content.includes('.woff2') || content.includes('.ttf') || content.match(/src\s*=\s*["'][^"']*\.(png|jpg|gif|webp)/i);
    if (hasHeavyAssets) {
      findings.push(sealFinding({
        severity: 'medium',
        category: 'performance',
        title: 'No resource hints found',
        description: 'The page loads fonts and images but does not use preload or prefetch hints.',
        file,
        fix: 'Add <link rel="preload"> for critical fonts and images.',
        confidence: 0.7,
      }));
    }
  }

  // Check for lazy loading
  const images = content.match(/<img[^>]*>/gi) || [];
  const lazyImages = content.match(/loading\s*=\s*["']lazy["']/gi) || [];
  if (images.length > 3 && lazyImages.length === 0) {
    findings.push(sealFinding({
      severity: 'medium',
      category: 'performance',
      title: 'Images without lazy loading',
      description: `Found ${images.length} images but none use loading="lazy". All images load immediately.`,
      file,
      fix: 'Add loading="lazy" to below-the-fold images.',
      confidence: 0.75,
    }));
  }

  return findings;
}

// ─── CSS Performance ───────────────────────────────────────

function checkCssPerformance(content: string, file: string): AuditFinding[] {
  const findings: AuditFinding[] = [];

  // Check for @import
  const importCount = (content.match(/@import/g) || []).length;
  if (importCount > 0) {
    findings.push(sealFinding({
      severity: 'medium',
      category: 'performance',
      title: 'CSS @import usage',
      description: `Found ${importCount} @import statements. CSS @import blocks parallel loading and increases render time.`,
      file,
      fix: 'Combine CSS files or use <link> tags instead of @import.',
      confidence: 0.85,
    }));
  }

  // Check for complex selectors
  const complexSelectors = (content.match(/[^{]*\{[^}]*\}/g) || []).filter((rule) => {
    const selector = rule.split('{')[0];
    return (selector.match(/>/g) || []).length > 3 || (selector.match(/\s+/g) || []).length > 5;
  });

  if (complexSelectors.length > 5) {
    findings.push(sealFinding({
      severity: 'low',
      category: 'performance',
      title: 'Complex CSS selectors',
      description: `Found ${complexSelectors.length} deeply nested or complex selectors. Complex selectors slow down rendering.`,
      file,
      fix: 'Simplify selectors and use BEM or utility classes.',
      confidence: 0.6,
    }));
  }

  return findings;
}

// ─── JS Performance ────────────────────────────────────────

function checkJsPerformance(content: string, file: string): AuditFinding[] {
  const findings: AuditFinding[] = [];

  // Check for synchronous XMLHttpRequest
  if (content.match(/\.open\s*\([^)]*,\s*[^)]*,\s*false\s*\)/)) {
    findings.push(sealFinding({
      severity: 'critical',
      category: 'performance',
      title: 'Synchronous XMLHttpRequest',
      description: 'Synchronous XHR blocks the main thread and freezes the UI during network requests.',
      file,
      fix: 'Use async/await or Promise-based fetch instead.',
      confidence: 0.95,
    }));
  }

  // Check for DOM manipulation in loops
  const forLoops = content.match(/for\s*\([^)]*\)\s*\{[\s\S]*?\}/g) || [];
  for (const loop of forLoops) {
    if (loop.includes('innerHTML') || loop.includes('appendChild') || loop.includes('insertAdjacentHTML')) {
      findings.push(sealFinding({
        severity: 'medium',
        category: 'performance',
        title: 'DOM manipulation inside loop',
        description: 'DOM manipulation inside a loop triggers multiple reflows and repaints.',
        file,
        fix: 'Batch DOM updates using DocumentFragment or build HTML string first, then insert once.',
        confidence: 0.85,
      }));
      break;
    }
  }

  // Check for memory leak patterns
  if (content.match(/addEventListener\s*\([^)]+\)/g) && !content.match(/removeEventListener\s*\(/)) {
    findings.push(sealFinding({
      severity: 'medium',
      category: 'performance',
      title: 'Event listeners without cleanup',
      description: 'Event listeners are added but never removed. This can cause memory leaks in SPA or component-based apps.',
      file,
      fix: 'Add corresponding removeEventListener calls or use AbortController for cleanup.',
      confidence: 0.6,
    }));
  }

  // Check for large bundle indicators
  const lines = content.split('\n').length;
  if (lines > 1000) {
    findings.push(sealFinding({
      severity: 'medium',
      category: 'performance',
      title: 'Large source file',
      description: `This file has ${lines} lines. Large files increase bundle size and load time.`,
      file,
      fix: 'Split into smaller modules or components.',
      confidence: 0.6,
    }));
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
