import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-orange/40';

const variants: Record<Variant, string> = {
  primary: 'bg-accent-orange text-primary-dark hover:bg-accent-orange/90 border border-transparent',
  secondary:
    'bg-secondary-darkSurface text-secondary-midGray border border-secondary-borderGray hover:text-primary-light hover:border-accent-orange',
  danger:
    'bg-secondary-darkSurface text-semantic-dangerRed border border-semantic-dangerRed hover:bg-semantic-dangerRed/10',
  ghost: 'bg-transparent text-secondary-midGray hover:text-primary-light border border-transparent',
};

const sizes: Record<Size, string> = {
  sm: 'text-small px-3 py-1.5',
  md: 'text-small px-4 py-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
