export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  category: 'audit' | 'feature' | 'review' | 'accessibility';
  scaffold: string;
}

/**
 * Plain-text scaffolds inserted into the workspace composer.
 * Section headers use the "Label:" form so FormattedPrompt renders them as
 * labeled blocks (Context / Requirements / Edge cases / Output style).
 */
export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'audit-fix-plan',
    title: 'Audit + Fix plan',
    description: 'Audit a site and produce a fix-ready prompt.',
    category: 'audit',
    scaffold: `Context:
We are auditing [site URL or repo] to find bugs, UX issues, and performance problems.

Requirements:
- Identify issues by severity (critical, high, medium, low)
- For each issue, provide a concrete fix
- Output a single fix-ready prompt a coding agent can execute

Edge cases:
- Pages that fail to load
- Dynamic or authenticated routes
- Third-party script errors

Output style:
Structured findings followed by a copy-paste prompt block.`,
  },
  {
    id: 'feature-spec',
    title: 'Feature spec',
    description: 'Specify a new feature as a master prompt.',
    category: 'feature',
    scaffold: `Context:
Building [feature] for [audience] on [stack].

Requirements:
- Define the user-facing behavior
- List acceptance criteria
- Note constraints and dependencies

Edge cases:
- Empty or invalid input
- Concurrent or repeated actions
- Offline or degraded network

Output style:
A concise master prompt the coding agent can implement from.`,
  },
  {
    id: 'website-review',
    title: 'Website review',
    description: 'General website quality review.',
    category: 'review',
    scaffold: `Context:
Reviewing [site] for overall quality: structure, content, and UX.

Requirements:
- Summarize what the site does
- Flag structural and content issues
- Suggest concrete improvements

Edge cases:
- Broken navigation
- Missing metadata or accessibility tags
- Inconsistent visual language

Output style:
Prioritized recommendations plus a prompt to act on them.`,
  },
  {
    id: 'accessibility-review',
    title: 'Accessibility review',
    description: 'WCAG and usability barrier audit.',
    category: 'accessibility',
    scaffold: `Context:
Accessibility audit of [site] against WCAG 2.1 AA.

Requirements:
- Detect contrast, keyboard, and screen-reader issues
- Rank by user impact
- Provide remediation per issue

Edge cases:
- Custom widgets without labels
- Motion that ignores reduced-motion
- Form errors not announced

Output style:
Findings with code-level fixes and a prompt to apply them.`,
  },
];
