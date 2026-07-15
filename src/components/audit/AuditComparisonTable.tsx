import { Check, Minus } from 'lucide-react';

const FEATURES = [
  { name: 'Static code analysis', basic: true, recommended: true, full: true },
  { name: 'HTML / CSS / JS inspection', basic: true, recommended: true, full: true },
  { name: 'Broken asset detection', basic: true, recommended: true, full: true },
  { name: 'HTTP status checks', basic: false, recommended: true, full: true },
  { name: 'Security header checks', basic: false, recommended: true, full: true },
  { name: 'Light browser testing', basic: false, recommended: true, full: true },
  { name: 'Full Playwright testing', basic: false, recommended: false, full: true },
  { name: 'Console error capture', basic: false, recommended: false, full: true },
  { name: 'Accessibility audit', basic: false, recommended: false, full: true },
  { name: 'Performance checks', basic: false, recommended: false, full: true },
  { name: 'Screenshot evidence', basic: false, recommended: false, full: true },
  { name: 'AI-powered report', basic: true, recommended: true, full: true },
];

function Indicator({ value }: { value: boolean }) {
  return value ? (
    <Check className="w-4 h-4 text-accent-success mx-auto" />
  ) : (
    <Minus className="w-4 h-4 text-ink-muted/20 mx-auto" />
  );
}

export default function AuditComparisonTable() {
  return (
    <div className="bg-surface-alt border border-border-soft rounded-md overflow-hidden">
      <div className="px-5 py-3 border-b border-border-soft">
        <h3 className="text-sm font-medium text-ink-primary">Compare Audit Modes</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-soft">
              <th className="px-5 py-2.5 text-xs font-medium text-ink-muted uppercase tracking-wider">Feature</th>
              <th className="px-3 py-2.5 text-xs font-medium text-accent-success uppercase tracking-wider text-center">Basic</th>
              <th className="px-3 py-2.5 text-xs font-medium text-accent-purple uppercase tracking-wider text-center">Recommended</th>
              <th className="px-3 py-2.5 text-xs font-medium text-accent-warning uppercase tracking-wider text-center">Full</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((feature, index) => (
              <tr
                key={feature.name}
                className={`border-b border-border-soft ${index % 2 === 0 ? 'bg-surface-base/50' : ''}`}
              >
                <td className="px-5 py-2 text-xs text-ink-muted">{feature.name}</td>
                <td className="px-3 py-2 text-center"><Indicator value={feature.basic} /></td>
                <td className="px-3 py-2 text-center"><Indicator value={feature.recommended} /></td>
                <td className="px-3 py-2 text-center"><Indicator value={feature.full} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
