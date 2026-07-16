interface CodeBackdropProps {
  className?: string;
  lines?: string[];
}

const DEFAULT_LINES = [
  '// prompt-designer — structured generation',
  'const chat = await workspace.create({',
  "  websiteType: 'SaaS',",
  "  audience: 'developers',",
  "  goal: 'signups',",
  "  style: 'minimal',",
  '});',
  '',
  'const idea = await chat.ask(`',
  '  Build a calm developer console',
  '  for crafting AI coding prompts',
  '`);',
  '',
  'const master = await generate(idea, {',
  "  preset: 'website-builder',",
  '  sections: [coding, ui-ux, audit],',
  '});',
  '',
  'master.sections.ui-ux.expand();',
  'master.sections.audit.run();',
  '// → fix prompts ready to ship',
];

export default function CodeBackdrop({
  className = '',
  lines = DEFAULT_LINES,
}: CodeBackdropProps) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}
    >
      <pre className="absolute inset-0 m-0 p-6 sm:p-10 text-[11px] sm:text-xs leading-6 text-secondary-midGray/10 font-mono whitespace-pre">
        {lines.join('\n')}
      </pre>
    </div>
  );
}
