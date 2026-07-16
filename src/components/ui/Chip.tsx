import type { ReactNode } from 'react';

type Variant = 'default' | 'accent' | 'danger';

interface ChipProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

const variants: Record<Variant, string> = {
  default: 'bg-secondary-darkSurface text-secondary-midGray border-secondary-borderGray',
  accent: 'bg-secondary-darkSurface text-accent-orange border-accent-orange',
  danger: 'bg-secondary-darkSurface text-semantic-dangerRed border-semantic-dangerRed',
};

export default function Chip({ children, variant = 'default', className = '' }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-pill border px-2 py-1 text-small ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
