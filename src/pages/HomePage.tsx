import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, MessageSquare, ShieldCheck, GitBranch } from 'lucide-react';
import PageShell from '../components/layout/PageShell';

const FEATURES = [
  {
    title: 'Chat Workspace',
    description: 'Generate structured master prompts through guided conversation. Refine requirements iteratively before producing output.',
    link: '/chat',
    icon: MessageSquare,
  },
  {
    title: 'Website AUDIT',
    description: 'Analyze websites for bugs, UX issues, security concerns, and performance problems using code analysis and browser testing.',
    link: '/audit',
    icon: ShieldCheck,
  },
  {
    title: 'Section Conversations',
    description: 'Branch master prompts into specialized sections: Coding, UI/UX, and Audit. Each section gets its own focused thread.',
    link: '/chat',
    icon: GitBranch,
  },
];

const CAPABILITIES = [
  { feature: 'Prompt generation', basic: true, recommended: true, full: true },
  { feature: 'Website AUDIT modes', basic: true, recommended: true, full: true },
  { feature: 'Section branches', basic: false, recommended: true, full: true },
  { feature: 'Browser testing', basic: false, recommended: true, full: true },
  { feature: 'Accessibility checks', basic: false, recommended: false, full: true },
  { feature: 'Performance metrics', basic: false, recommended: false, full: true },
];

export default function HomePage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('/chat');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageShell>
      {/* Hero */}
      <section className="py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-ink-primary mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1 }}>
          Prompt Workspace + Website AUDIT for developers
        </h1>
        <p className="text-ink-muted text-base mb-8">
          Generate structured prompts with specialized branches. Audit websites for bugs, UX, and performance.
        </p>

        {/* Command strip */}
        <div className="inline-flex items-center gap-3 bg-surface-alt border border-border-soft rounded-md px-4 py-3">
          <span className="text-accent-primary text-sm">$</span>
          <code className="text-sm text-ink-primary flex-1">Start a new chat at /chat</code>
          <button
            onClick={handleCopy}
            className="p-1 rounded-sm text-ink-muted hover:text-accent-primary hover:bg-surface-hover transition-colors duration-150"
            aria-label="Copy command"
          >
            {copied ? <Check className="w-4 h-4 text-accent-success" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mb-16">
        <h2 className="text-xl font-bold text-accent-purple mb-6">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                to={feature.link}
                className="block bg-surface-alt border border-border-soft rounded-md p-5 hover:border-accent-primary/30 transition-colors duration-150"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-md bg-surface-hover border border-border-soft flex items-center justify-center">
                    <Icon className="w-4 h-4 text-accent-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-ink-primary">{feature.title}</h3>
                </div>
                <p className="text-sm text-ink-muted leading-relaxed">{feature.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Technical overview table */}
      <section className="mb-16">
        <h2 className="text-xl font-bold text-accent-purple mb-6">Capabilities</h2>
        <div className="bg-surface-alt border border-border-soft rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft">
                <th className="text-left px-4 py-3 font-semibold text-ink-primary">Feature</th>
                <th className="text-center px-4 py-3 font-semibold text-accent-success">Basic</th>
                <th className="text-center px-4 py-3 font-semibold text-accent-blue">Recommended</th>
                <th className="text-center px-4 py-3 font-semibold text-accent-warning">Full</th>
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((row, i) => (
                <tr key={row.feature} className={i < CAPABILITIES.length - 1 ? 'border-b border-border-soft' : ''}>
                  <td className="px-4 py-3 text-ink-primary">{row.feature}</td>
                  <td className="px-4 py-3 text-center">
                    {row.basic ? (
                      <Check className="w-4 h-4 text-accent-success mx-auto" />
                    ) : (
                      <span className="text-ink-muted/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.recommended ? (
                      <Check className="w-4 h-4 text-accent-blue mx-auto" />
                    ) : (
                      <span className="text-ink-muted/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.full ? (
                      <Check className="w-4 h-4 text-accent-warning mx-auto" />
                    ) : (
                      <span className="text-ink-muted/30">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border-soft">
        <p className="text-xs text-ink-muted">
          Prompt Designer — built for developers who write code, not marketing copy.
        </p>
      </footer>
    </PageShell>
  );
}
