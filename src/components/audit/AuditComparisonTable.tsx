import { Check, Minus } from 'lucide-react';
import Card from '../ui/Card';
import SimpleTable, { tableRowCls, tableCellCls } from '../ui/SimpleTable';

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
    <Check className="w-4 h-4 text-success-green mx-auto" />
  ) : (
    <Minus className="w-4 h-4 text-secondary-midGray/30 mx-auto" />
  );
}

export default function AuditComparisonTable() {
  return (
    <Card title="Compare Audit Modes">
      <SimpleTable headers={['Feature', 'Basic', 'Recommended', 'Full']}>
        {FEATURES.map((feature) => (
          <tr key={feature.name} className={tableRowCls}>
            <td className={`${tableCellCls} text-secondary-midGray`}>{feature.name}</td>
            <td className={`${tableCellCls} text-center`}>
              <Indicator value={feature.basic} />
            </td>
            <td className={`${tableCellCls} text-center`}>
              <Indicator value={feature.recommended} />
            </td>
            <td className={`${tableCellCls} text-center`}>
              <Indicator value={feature.full} />
            </td>
          </tr>
        ))}
      </SimpleTable>
    </Card>
  );
}
