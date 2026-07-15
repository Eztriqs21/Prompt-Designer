import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  /** Optional max-width override (default: 1280px) */
  maxWidth?: string;
}

export default function PageShell({ children, maxWidth = 'max-w-6xl' }: PageShellProps) {
  return (
    <div className={`w-full ${maxWidth} mx-auto px-6 py-8`}>
      {children}
    </div>
  );
}
