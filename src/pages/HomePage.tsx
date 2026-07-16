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
        <h1 className="text-display text-primary-light mb-4">
          Prompt Workspace + Website AUDIT for developers
        </h1>
          <p className="text-body text-secondary-midGray mb-8">
          Generate structured prompts with specialized branches. Audit websites for bugs, UX, and performance.
        </p>

        {/* Command strip */}
        <div className="inline-flex items-center gap-3 bg-secondary-darkSurface border border-secondary-borderGray rounded-md px-4 py-3">
          <span className="text-accent-purple text-sm">$</span>
          <code className="text-sm text-primary-light flex-1">Start a new chat at /chat</code>
          <button
            onClick={handleCopy}
            className="p-1 rounded-sm text-secondary-midGray hover:text-accent-orange hover:bg-primary-light/5 transition-colors duration-150"
            aria-label="Copy command"
          >
            {copied ? <Check className="w-4 h-4 text-success-green" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mb-8">
        <h2 className="text-subheading text-primary-light mb-4">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                to={feature.link}
                className="block bg-secondary-darkSurface border border-secondary-borderGray rounded-md p-5 hover:border-accent-orange transition-colors duration-150"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-md bg-secondary-darkSurface border border-secondary-borderGray flex items-center justify-center">
                    <Icon className="w-4 h-4 text-accent-orange" />
                  </div>
                  <h3 className="text-small font-semibold text-primary-light">{feature.title}</h3>
                </div>
                  <p className="text-small text-secondary-midGray leading-relaxed">{feature.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Technical overview table */}
      <section className="mb-8">
        <h2 className="text-subheading text-primary-light mb-4">Capabilities</h2>
        <div className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-borderGray">
                <th className="text-left px-4 py-3 text-small font-medium text-secondary-midGray">Feature</th>
                <th className="text-center px-4 py-3 text-small font-medium text-secondary-midGray">Basic</th>
                <th className="text-center px-4 py-3 text-small font-medium text-secondary-midGray">Recommended</th>
                <th className="text-center px-4 py-3 text-small font-medium text-secondary-midGray">Full</th>
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((row, i) => (
                <tr key={row.feature} className={i < CAPABILITIES.length - 1 ? 'border-b border-secondary-borderGray' : ''}>
                  <td className="px-4 py-3 text-primary-light">{row.feature}</td>
                  <td className="px-4 py-3 text-center">
                    {row.basic ? (
                      <Check className="w-4 h-4 text-success-green mx-auto" />
                    ) : (
                      <span className="text-secondary-midGray/30">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.recommended ? (
                      <Check className="w-4 h-4 text-success-green mx-auto" />
                    ) : (
                      <span className="text-secondary-midGray/30">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.full ? (
                      <Check className="w-4 h-4 text-success-green mx-auto" />
                    ) : (
                      <span className="text-secondary-midGray/30">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-secondary-borderGray">
          <p className="text-small text-secondary-midGray">
          Prompt Designer - built for developers who write code, not marketing copy.
        </p>
      </footer>
    </PageShell>
  );
}
