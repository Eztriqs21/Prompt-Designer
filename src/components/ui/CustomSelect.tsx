import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Close on outside click
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

  // Close on Escape, navigate with arrow keys
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

  // Scroll highlighted option into view
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
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className="w-full flex items-center justify-between appearance-none bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.12] rounded-lg px-3 py-2 text-[13px] text-white/80 focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-200 cursor-pointer"
      >
        <span className="truncate font-medium tracking-wide">{selectedLabel}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="ml-2 shrink-0"
        >
          <ChevronDown className="w-3.5 h-3.5 text-white/30" />
        </motion.span>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="fixed z-[9999] mt-1.5 rounded-xl border border-white/[0.08] bg-[#0c0c10]/95 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden max-h-60 overflow-y-auto origin-top"
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
                    className={`w-full text-left px-3 py-2 text-[13px] flex items-center justify-between transition-colors duration-100 ${
                      isSelected
                        ? 'text-white bg-white/[0.06]'
                        : isHighlighted
                          ? 'text-white bg-white/[0.04]'
                          : 'text-white/55 hover:text-white/80 hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="font-medium tracking-wide">{option.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white/40 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
