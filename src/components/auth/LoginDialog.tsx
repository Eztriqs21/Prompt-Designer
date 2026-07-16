import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GoogleLoginButton from './GoogleLoginButton';
import EmailLoginForm from './EmailLoginForm';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function LoginDialog({ open, onClose }: LoginDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useRef(`login-title-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusables = cardRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-primary-dark/70 z-[999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div
              ref={cardRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="bg-secondary-darkSurface rounded-md border border-secondary-borderGray shadow-lg w-full max-w-sm flex flex-col"
            >
              <div className="px-5 py-4 border-b border-secondary-borderGray flex items-center justify-between shrink-0">
                <h3 id={titleId} className="text-body font-semibold text-primary-light">
                  Sign in
                </h3>
                <button
                  ref={closeRef}
                  onClick={onClose}
                  className="text-small text-secondary-midGray hover:text-primary-light transition-colors px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-orange/40 rounded"
                  aria-label="Close sign in"
                >
                  Close
                </button>
              </div>

              <div className="px-5 py-5 space-y-4">
                <GoogleLoginButton />

                <div className="flex items-center gap-3 text-small text-secondary-midGray">
                  <span className="h-px flex-1 bg-secondary-borderGray" />
                  <span>or</span>
                  <span className="h-px flex-1 bg-secondary-borderGray" />
                </div>

                <EmailLoginForm />

                <p className="text-small text-secondary-midGray/70 leading-relaxed text-center">
                  Signed-in memory is saved to your browser. Anonymous sessions stay temporary and are
                  never stored.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
