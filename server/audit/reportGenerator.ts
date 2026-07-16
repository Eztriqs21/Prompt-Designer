import { generateWithFallback } from '../geminiClient.js';
import type { AuditFinding, AuditEvidence, AuditReport, Severity } from '../db/auditStore.js';

const fs = await import('fs');
const path = await import('path');

// ─── Blueprint Prompt Loader ───────────────────────────────

const ASSETS_DIR = path.join(process.cwd(), 'src', 'assets');

const BLUEPRINT_FILES: Record<string, string> = {
  basic: path.join(ASSETS_DIR, 'Basic Audit Prompt.txt'),
  recommended: path.join(ASSETS_DIR, 'Recommended Audit Prompt.txt'),
  full: path.join(ASSETS_DIR, 'Full Audit Prompt.txt'),
};

const PLACEHOLDER = '{{WEBSITE_LINK}}';

function loadBlueprintPrompt(mode: string, inputType: string, source: string): string | null {
  const filePath = BLUEPRINT_FILES[mode];
  if (!filePath) return null;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return injectSourceIntoPrompt(content, inputType, source);
  } catch (err: any) {
    console.error(`Failed to load blueprint prompt from ${filePath}:`, err.message);
    return null;
  }
}

function injectSourceIntoPrompt(template: string, inputType: string, source: string): string {
  let replacement: string;

  if (inputType === 'url' || inputType === 'github') {
    replacement = source;
  } else {
    replacement = 'Source files uploaded locally — analyze the code without a live URL.';
  }

  return template.replace(new RegExp(PLACEHOLDER.replace(/[{}]/g, '\\$&'), 'g'), replacement);
}

// ─── Score Calculation ─────────────────────────────────────

function calculateScore(findings: AuditFinding[]): number {
  if (findings.length === 0) return 100;

  let penalty = 0;
  for (const f of findings) {
    const weight = f.confidence;
    switch (f.severity) {
      case 'critical': penalty += 25 * weight; break;
      case 'high': penalty += 15 * weight; break;
      case 'medium': penalty += 8 * weight; break;
      case 'low': penalty += 3 * weight; break;
      case 'info': penalty += 0.5 * weight; break;
    }
  }

  return Math.max(0, Math.round(100 - penalty));
}

function countBySeverity(findings: AuditFinding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    counts[f.severity]++;
  }
  return counts;
}

function categorizeFindings(findings: AuditFinding[]) {
  const codeIssues = findings.filter((f) => f.category === 'code-quality' || f.category === 'bug');
  const browserIssues = findings.filter((f) => f.category === 'ux' || f.category === 'security');
  const accessibilityIssues = findings.filter((f) => f.category === 'accessibility');
  const performanceIssues = findings.filter((f) => f.category === 'performance');
  return { codeIssues, browserIssues, accessibilityIssues, performanceIssues };
}

// ─── Findings Context Builder ──────────────────────────────

function buildFindingsContext(
  findings: AuditFinding[],
  evidence: AuditEvidence[],
  inputType: string,
  source: string,
  mode: string,
): string {
  const severityCounts = countBySeverity(findings);

  const findingsSummary = findings.slice(0, 50).map((f) => {
    const parts = [
      `[${f.severity.toUpperCase()}] [${f.category}] ${f.title}`,
      f.description,
    ];
    if (f.file) parts.push(`File: ${f.file}${f.line ? `:${f.line}` : ''}`);
    if (f.fix) parts.push(`Fix: ${f.fix}`);
    return parts.join('\n');
  }).join('\n\n');

  const evidenceSummary = evidence.slice(0, 20).map((e) => {
    const parts = [`[${e.type}] ${e.jobStage}`];
    if (e.metadata) {
      const meta = Object.entries(e.metadata)
        .filter(([k]) => k !== 'base64')
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(', ');
      if (meta) parts.push(`  ${meta}`);
    }
    return parts.join('\n');
  }).join('\n');

  return `AUDIT CONTEXT:
- Input type: ${inputType}
- Source: ${source}
- Audit mode: ${mode}
- Total findings: ${findings.length}
- Critical: ${severityCounts.critical}, High: ${severityCounts.high}, Medium: ${severityCounts.medium}, Low: ${severityCounts.low}, Info: ${severityCounts.info}

FINDINGS:
${findingsSummary || '(No findings detected)'}

EVIDENCE COLLECTED:
${evidenceSummary || '(No evidence collected)'}

TASK:
Analyze the findings and evidence above. Produce a JSON response with exactly this structure:
{
  "summary": "A 3-5 sentence executive summary of the audit. Highlight the most important findings, overall quality assessment, and top recommendation. Do NOT invent issues beyond what the findings show.",
  "recommendations": ["An array of 5-10 top actionable recommendations, prioritized by impact. Each should be a concise sentence."],
  "fixPrompt": "A detailed implementation prompt that a coding agent can follow to fix ALL issues found in this audit. Structure it as a self-contained brief with: (1) ROLE section telling the agent what they are, (2) AUDIT SUMMARY with the overall score and key findings, (3) CRITICAL FIXES section with exact steps for critical/high issues, (4) IMPROVEMENTS section for medium/low issues, (5) TESTING section to verify fixes, (6) OUTPUT section describing expected changes. Include file references, specific code patterns to fix, and verification steps. Make it detailed enough that a coding agent can execute without follow-up questions."
}

RULES:
- Base your summary ONLY on the findings provided. Do NOT invent new issues.
- Be professional and direct.
- Focus on actionable advice.
- The summary should help a developer understand the overall state of the website at a glance.
- Recommendations should be ordered from highest to lowest impact.
- The fixPrompt must be comprehensive and cover every finding that has a fix suggestion.`;
}

// ─── Fallback Fix Prompt Builder ───────────────────────────

function buildFallbackFixPrompt(
  findings: AuditFinding[],
  inputType: string,
  source: string,
  score: number,
): string {
  const criticalHigh = findings.filter((f) => f.severity === 'critical' || f.severity === 'high');
  const medium = findings.filter((f) => f.severity === 'medium');
  const low = findings.filter((f) => f.severity === 'low' || f.severity === 'info');

  const sections: string[] = [];

  sections.push(`# Website Audit Fix Prompt`);
  sections.push('');
  sections.push(`## ROLE`);
  sections.push(`You are a senior full-stack developer tasked with fixing all issues found in a website audit. You must address every issue systematically, verify your changes, and ensure no regressions.`);
  sections.push('');
  sections.push(`## AUDIT SUMMARY`);
  sections.push(`- Source: ${source}`);
  sections.push(`- Input type: ${inputType}`);
  sections.push(`- Quality score: ${score}/100`);
  sections.push(`- Total issues: ${findings.length}`);
  sections.push(`- Critical/High: ${criticalHigh.length}`);
  sections.push(`- Medium: ${medium.length}`);
  sections.push(`- Low/Info: ${low.length}`);
  sections.push('');

  if (criticalHigh.length > 0) {
    sections.push(`## CRITICAL AND HIGH PRIORITY FIXES`);
    sections.push(`These issues must be fixed immediately as they affect functionality, security, or user experience.`);
    sections.push('');
    for (const f of criticalHigh) {
      sections.push(`### [${f.severity.toUpperCase()}] ${f.title}`);
      sections.push(`**Category:** ${f.category}`);
      if (f.file) sections.push(`**File:** ${f.file}${f.line ? `:${f.line}` : ''}`);
      sections.push(`**Issue:** ${f.description}`);
      if (f.fix) sections.push(`**Fix:** ${f.fix}`);
      sections.push('');
    }
  }

  if (medium.length > 0) {
    sections.push(`## MEDIUM PRIORITY IMPROVEMENTS`);
    sections.push(`These issues should be addressed to improve code quality and user experience.`);
    sections.push('');
    for (const f of medium) {
      sections.push(`### ${f.title}`);
      sections.push(`**Category:** ${f.category}`);
      if (f.file) sections.push(`**File:** ${f.file}${f.line ? `:${f.line}` : ''}`);
      sections.push(`**Issue:** ${f.description}`);
      if (f.fix) sections.push(`**Fix:** ${f.fix}`);
      sections.push('');
    }
  }

  if (low.length > 0) {
    sections.push(`## LOW PRIORITY SUGGESTIONS`);
    sections.push(`These are minor improvements that can be addressed when convenient.`);
    sections.push('');
    for (const f of low) {
      sections.push(`- **${f.title}**: ${f.fix || f.description}`);
    }
    sections.push('');
  }

  sections.push(`## TESTING`);
  sections.push(`After making fixes:`);
  sections.push(`1. Verify all pages load without console errors`);
  sections.push(`2. Test on mobile viewports (375px, 768px, 1024px)`);
  sections.push(`3. Check that all images have alt text`);
  sections.push(`4. Verify form inputs have associated labels`);
  sections.push(`5. Run the audit again to confirm score improvement`);
  sections.push('');

  sections.push(`## OUTPUT`);
  sections.push(`Provide a summary of all changes made, files modified, and any remaining items that need manual attention.`);

  return sections.join('\n');
}

// ─── Main Entry Point ──────────────────────────────────────

export async function generateReport(
  findings: AuditFinding[],
  evidence: AuditEvidence[],
  inputType: string,
  source: string,
  mode: string,
): Promise<AuditReport> {
  const score = calculateScore(findings);
  const severityCounts = countBySeverity(findings);
  const categorized = categorizeFindings(findings);

  let summary = '';
  let recommendations: string[] = [];
  let fixPrompt = '';
  let generatedBy: string | undefined;

  if (findings.length > 0) {
    try {
      // Load the blueprint prompt for the current mode
      const blueprintPrompt = loadBlueprintPrompt(mode, inputType, source);
      const findingsContext = buildFindingsContext(findings, evidence, inputType, source, mode);

      let systemMessage: string;
      let userMessage: string;

      if (blueprintPrompt) {
        // Use the blueprint as the system message
        systemMessage = blueprintPrompt;
        userMessage = findingsContext;
      } else {
        // Fallback to inline system message
        systemMessage = 'You are a professional website auditor. Respond only in valid JSON.';
        userMessage = findingsContext;
      }

      console.log(`[Report] Generating AI report: mode=${mode}, findings=${findings.length}, evidence=${evidence.length}, blueprint=${blueprintPrompt ? 'loaded' : 'fallback'}`);

      const result = await generateWithFallback(
        [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        {
          temperature: 0.4,
          maxTokens: 4096,
          responseFormat: { type: 'json_object' },
        },
      );

      console.log(`[Report] AI report generated successfully: model=${result.meta?.model}`);
      generatedBy = result.meta?.model;

      const parsed = JSON.parse(result.content);
      summary = parsed.summary || '';
      recommendations = parsed.recommendations || [];
      fixPrompt = parsed.fixPrompt || '';
    } catch (err) {
      console.error('[Report] Failed to generate AI report, using fallback:', err);
      summary = generateFallbackSummary(findings, severityCounts, score);
      recommendations = generateFallbackRecommendations(findings);
      fixPrompt = buildFallbackFixPrompt(findings, inputType, source, score);
    }
  } else {
    summary = 'No issues were detected during the audit. The website appears to be in good condition based on the analysis performed.';
    recommendations = ['Continue monitoring code quality with regular audits.', 'Consider running a Full Audit for deeper browser-based testing.'];
    fixPrompt = 'No fixes needed — the audit found no issues. Continue maintaining code quality with regular audits.';
  }

  // Ensure fixPrompt always has content
  if (!fixPrompt) {
    fixPrompt = buildFallbackFixPrompt(findings, inputType, source, score);
  }

  return {
    summary,
    score,
    severityCounts,
    findings,
    codeIssues: categorized.codeIssues,
    browserIssues: categorized.browserIssues,
    accessibilityIssues: categorized.accessibilityIssues,
    performanceIssues: categorized.performanceIssues,
    recommendations,
    evidence,
    fixPrompt,
    generatedBy,
  };
}

// ─── Fallback Summary ──────────────────────────────────────

function generateFallbackSummary(
  findings: AuditFinding[],
  severityCounts: Record<Severity, number>,
  score: number,
): string {
  const parts: string[] = [];

  parts.push(`Audit complete. Overall quality score: ${score}/100.`);

  if (severityCounts.critical > 0) {
    parts.push(`${severityCounts.critical} critical issue(s) found that require immediate attention.`);
  }
  if (severityCounts.high > 0) {
    parts.push(`${severityCounts.high} high-severity issue(s) should be addressed soon.`);
  }
  if (severityCounts.medium > 0) {
    parts.push(`${severityCounts.medium} medium-severity issue(s) were identified for improvement.`);
  }
  if (severityCounts.low + severityCounts.info > 0) {
    parts.push(`${severityCounts.low + severityCounts.info} minor suggestion(s) for optimization.`);
  }

  return parts.join(' ');
}

function generateFallbackRecommendations(findings: AuditFinding[]): string[] {
  const recommendations: string[] = [];
  const seen = new Set<string>();

  const sorted = [...findings].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return order[a.severity] - order[b.severity];
  });

  for (const f of sorted) {
    if (f.fix && !seen.has(f.fix)) {
      seen.add(f.fix);
      recommendations.push(f.fix);
      if (recommendations.length >= 10) break;
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Review the detailed findings for specific improvement areas.');
  }

  return recommendations;
}
