import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CustomSelect({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder;

  const close = useCallback(() => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, close]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(options.findIndex((o) => o.value === value));
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % options.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          onChange(options[highlightedIndex].value);
          close();
        }
        break;
    }
  };

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-option]');
    const el = items[highlightedIndex] as HTMLElement | undefined;
    if (el) {
      const list = listRef.current;
      const itemTop = el.offsetTop;
      const itemBottom = itemTop + el.offsetHeight;
      if (itemTop < list.scrollTop) {
        list.scrollTop = itemTop;
      } else if (itemBottom > list.scrollTop + list.clientHeight) {
        list.scrollTop = itemBottom - list.clientHeight;
      }
    }
  }, [isOpen, highlightedIndex]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className="w-full flex items-center justify-between appearance-none bg-primary-dark hover:bg-secondary-darkSurface border border-secondary-borderGray hover:border-accent-blue/30 rounded-md px-3 py-2 text-sm text-primary-light focus:outline-none focus:border-accent-blue/40 transition-colors cursor-pointer"
      >
        <span className="truncate font-medium">{selectedLabel}</span>
        <span className={`ml-2 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-3.5 h-3.5 text-secondary-midGray" />
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="fixed z-[9999] mt-1.5 rounded-md border border-secondary-borderGray bg-primary-dark shadow-md overflow-hidden max-h-60 overflow-y-auto"
          style={{
            width: containerRef.current?.offsetWidth ?? 200,
            top: (containerRef.current?.getBoundingClientRect().bottom ?? 0) + 6,
            left: containerRef.current?.getBoundingClientRect().left ?? 0,
          }}
        >
          <div className="py-1">
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;
              return (
                <button
                  key={option.value}
                  type="button"
                  data-option
                  onClick={() => {
                    onChange(option.value);
                    close();
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors duration-100 ${
                    isSelected
                      ? 'text-primary-light bg-secondary-darkSurface'
                      : isHighlighted
                        ? 'text-primary-light bg-secondary-darkSurface'
                        : 'text-secondary-midGray hover:text-primary-light hover:bg-secondary-darkSurface'
                  }`}
                >
                  <span className="font-medium">{option.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-secondary-midGray shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
