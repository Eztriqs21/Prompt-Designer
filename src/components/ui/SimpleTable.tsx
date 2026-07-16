import type { ReactNode } from 'react';

interface SimpleTableProps {
  headers: ReactNode[];
  children: ReactNode;
  className?: string;
}

/* Consumers should render rows like:
   <tr className={tableRowCls}>
     <td className={tableCellCls}>...</td>
   </tr>
*/
export const tableRowCls =
  'bg-secondary-darkSurface text-primary-light border-b border-secondary-borderGray';
export const tableCellCls = 'px-3 py-2 border border-secondary-borderGray align-top';

export default function SimpleTable({ headers, children, className = '' }: SimpleTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse text-body ${className}`}>
        <thead>
          <tr className="bg-primary-dark text-secondary-midGray text-small">
            {headers.map((h, i) => (
              <th
                key={i}
                className="text-left font-medium px-3 py-2 border border-secondary-borderGray"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
