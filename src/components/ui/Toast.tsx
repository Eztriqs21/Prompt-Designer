import { createContext, useCallback, useContext, useState, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ToastItem {
  id: number;
  message: string;
}

interface ToastContextValue {
  show: (message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, durationMs = 2500) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[1100] flex flex-col gap-2 items-end pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="pointer-events-auto px-4 py-2.5 rounded-md bg-secondary-darkSurface border border-secondary-borderGray text-primary-light text-sm shadow-lg"
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safe no-op fallback so components don't crash outside a provider.
    return { show: () => {} };
  }
  return ctx;
}
