import { Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MessageSquare, ShieldCheck, History, Wrench, Check } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import Button from '../components/ui/Button';

const FEATURES = [
  {
    title: 'Prompt Workspace',
    description: 'Structured prompt editor with guided generation.',
    bullets: [
      'Generate master prompts through conversation',
      'Branch into Coding / UI-UX / Audit sections',
      'Copy or export for your coding agent',
    ],
    link: '/chat',
    icon: MessageSquare,
  },
  {
    title: 'Website AUDIT',
    description: 'Technical audit pipeline for any web target.',
    bullets: [
      'Pick Basic, Recommended, or Full mode',
      'Code analysis plus live browser testing',
      'Structured, severity-ranked findings',
    ],
    link: '/audit',
    icon: ShieldCheck,
  },
  {
    title: 'History',
    description: 'A session log for everything you build.',
    bullets: [
      'Saved chats and generated prompts',
      'Past audit runs with fix prompts',
      'Re-open context in one click',
    ],
    link: '/history',
    icon: History,
  },
  {
    title: 'Fix prompts / agent handoff',
    description: 'Output built for coding agents.',
    bullets: [
      'Copy a fix-ready prompt block',
      'Drop into Claude Code / OpenCode-style tools',
      'Preserves findings and context',
    ],
    link: '/chat',
    icon: Wrench,
  },
];

const FLOW = ['Prompt', 'Audit', 'Findings', 'Fix prompt'];

const STEPS = [
  {
    title: 'Generate or write a prompt',
    description: 'Draft a master prompt in the workspace or paste your own. Branch into specialized sections as needed.',
  },
  {
    title: 'Run the audit',
    description: 'Point the audit at a URL, repo, or files. Pick a mode and let the pipeline inspect code and runtime.',
  },
  {
    title: 'Copy the fix-ready prompt',
    description: 'Take the generated fix prompt and drop it into your coding agent to start resolving findings.',
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
  const navigate = useNavigate();

  return (
    <PageShell>
      {/* Hero */}
      <section className="py-16 md:py-24">
        <h1 className="text-display text-primary-light mb-4 max-w-[20ch]">
          Prompt Workspace + Website AUDIT for developers
        </h1>
        <p className="text-body text-secondary-midGray mb-8 max-w-[62ch]">
          Write and refine structured prompts, run a technical website audit, then copy a fix-ready prompt straight into your
          coding agent.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <Button variant="primary" size="md" onClick={() => navigate('/chat')}>
              Get Started
            </Button>
            <p className="text-small text-secondary-midGray mt-2 max-w-[34ch]">
              Open the Prompt Workspace and generate your first prompt.
            </p>
          </div>
          <div>
            <Button variant="secondary" size="md" onClick={() => navigate('/audit')}>
              Run Website AUDIT
            </Button>
            <p className="text-small text-secondary-midGray mt-2 max-w-[34ch]">
              Analyze a site across code, UX, accessibility, and performance.
            </p>
          </div>
        </div>
      </section>

      {/* System visual */}
      <section className="mb-16">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 font-mono">
          {FLOW.map((step, i) => (
            <Fragment key={step}>
              <div className="flex-1 bg-secondary-darkSurface border border-secondary-borderGray rounded-md px-4 py-3 text-center">
                <div className="text-small text-accent-purple">{`0${i + 1}`}</div>
                <div className="text-body text-primary-light mt-1">{step}</div>
              </div>
              {i < FLOW.length - 1 && (
                <ArrowRight className="w-4 h-4 text-accent-orange shrink-0 self-center hidden sm:block" />
              )}
            </Fragment>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mb-16">
        <h2 className="text-subheading text-primary-light mb-4">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md p-5"
            >
              <div className="text-small font-semibold text-accent-orange mb-2">{`Step ${i + 1}`}</div>
              <h3 className="text-body font-medium text-primary-light mb-1.5">{step.title}</h3>
              <p className="text-small text-secondary-midGray leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature tiles */}
      <section className="mb-16">
        <h2 className="text-subheading text-primary-light mb-4">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                to={feature.link}
                className="block bg-secondary-darkSurface border border-secondary-borderGray rounded-md p-5 hover:border-accent-orange transition-colors duration-150"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-md bg-primary-dark border border-secondary-borderGray flex items-center justify-center">
                    <Icon className="w-4 h-4 text-accent-orange" />
                  </div>
                  <h3 className="text-body font-semibold text-primary-light">{feature.title}</h3>
                </div>
                <p className="text-small text-secondary-midGray leading-relaxed mb-3">{feature.description}</p>
                <ul className="space-y-1.5">
                  {feature.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-small text-secondary-midGray">
                      <Check className="w-3.5 h-3.5 text-success-green mt-0.5 shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Technical overview table */}
      <section className="mb-16">
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
                <tr
                  key={row.feature}
                  className={i < CAPABILITIES.length - 1 ? 'border-b border-secondary-borderGray' : ''}
                >
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

      {/* Final CTA footer */}
      <footer className="py-12 border-t border-secondary-borderGray">
        <h2 className="text-subheading text-primary-light mb-4">Start building</h2>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Button variant="primary" size="md" onClick={() => navigate('/chat')}>
            Open Prompt Workspace
          </Button>
          <Button variant="secondary" size="md" onClick={() => navigate('/audit')}>
            Run Website AUDIT
          </Button>
        </div>
        <p className="text-small text-secondary-midGray">
          Prompt Designer — built for developers who write code, not marketing copy.
        </p>
      </footer>
    </PageShell>
  );
}
