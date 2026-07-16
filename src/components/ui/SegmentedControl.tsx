import type { ReactNode } from 'react';

interface Option<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex bg-primary-dark border border-secondary-borderGray rounded-md p-1 gap-1 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-sm text-small transition-colors duration-150 ${
              active
                ? 'bg-accent-orange text-primary-dark'
                : 'bg-secondary-darkSurface text-secondary-midGray hover:text-primary-light'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
