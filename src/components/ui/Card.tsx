import type { ReactNode } from 'react';

interface CardProps {
  children?: ReactNode;
  title?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export default function Card({ children, title, header, footer, className = '' }: CardProps) {
  return (
    <div className={`bg-secondary-darkSurface border border-secondary-borderGray rounded-md p-4 ${className}`}>
      {(header ?? title) && (
        <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-secondary-borderGray">
          {title && <div className="text-subheading text-primary-light">{title}</div>}
          {header}
        </div>
      )}
      {children}
      {footer && (
        <div className="mt-3 pt-3 border-t border-secondary-borderGray">{footer}</div>
      )}
    </div>
  );
}
