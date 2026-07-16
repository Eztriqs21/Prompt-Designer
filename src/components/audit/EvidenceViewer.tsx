import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Terminal, WifiOff, ListTree, Code2 } from 'lucide-react';
import type { AuditEvidence } from '../../types';

interface EvidenceViewerProps {
  open: boolean;
  evidence: AuditEvidence[];
  onClose: () => void;
}

const TYPE_META: Record<AuditEvidence['type'], { label: string; Icon: typeof Camera }> = {
  screenshot: { label: 'Screenshot', Icon: Camera },
  'console-log': { label: 'Console log', Icon: Terminal },
  'network-error': { label: 'Network error', Icon: WifiOff },
  trace: { label: 'Trace', Icon: ListTree },
  'dom-snapshot': { label: 'DOM snapshot', Icon: Code2 },
};

function fmtTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

function renderContent(item: AuditEvidence) {
  const meta = item.metadata ?? {};
  const dataUrl = (meta.dataUrl as string | undefined) ?? (meta.url as string | undefined);
  if (item.type === 'screenshot' && dataUrl) {
    return (
      <img
        src={dataUrl}
        alt={item.filePath}
        className="rounded-md border border-secondary-borderGray max-h-[320px] w-auto"
      />
    );
  }
  const text =
    (meta.content as string | undefined) ??
    (meta.text as string | undefined) ??
    (Array.isArray(meta.lines) ? (meta.lines as unknown[]).join('\n') : (meta.lines as string | undefined));
  if (typeof text === 'string' && text.trim()) {
    return (
      <pre className="font-mono text-small text-secondary-midGray whitespace-pre-wrap leading-relaxed bg-primary-dark border border-secondary-borderGray rounded-md p-3 overflow-x-auto">
        {text}
      </pre>
    );
  }
  return (
    <p className="text-small text-secondary-midGray/70 font-mono truncate">
      Stored at {item.filePath}
    </p>
  );
}

export default function EvidenceViewer({ open, evidence, onClose }: EvidenceViewerProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useRef(`evidence-title-${Math.random().toString(36).slice(2, 8)}`).current;

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
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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
              className="bg-secondary-darkSurface rounded-md border border-secondary-borderGray shadow-lg w-full max-w-2xl max-h-[85vh] flex flex-col"
            >
              <div className="px-5 py-4 border-b border-secondary-borderGray flex items-center justify-between shrink-0">
                <h3 id={titleId} className="text-body font-semibold text-primary-light">
                  Evidence{evidence.length ? ` (${evidence.length})` : ''}
                </h3>
                <button
                  ref={closeRef}
                  onClick={onClose}
                  className="text-small text-secondary-midGray hover:text-primary-light transition-colors px-2 py-1"
                  aria-label="Close evidence"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
                {evidence.length === 0 ? (
                  <div className="px-2 py-10 text-center">
                    <p className="text-body text-secondary-midGray">
                      No evidence was captured for this audit.
                    </p>
                    <p className="text-small text-secondary-midGray/60 mt-1">
                      Re-run a Full audit to collect screenshots, console logs, and snapshots.
                    </p>
                  </div>
                ) : (
                  evidence.map((item) => {
                    const meta = TYPE_META[item.type];
                    const Icon = meta.Icon;
                    return (
                      <div
                        key={item.id}
                        className="rounded-md border border-secondary-borderGray bg-primary-dark overflow-hidden"
                      >
                        <div className="px-4 py-2.5 flex items-center gap-2 border-b border-secondary-borderGray">
                          <Icon className="w-3.5 h-3.5 text-accent-orange shrink-0" />
                          <span className="text-small font-medium text-accent-purple">{meta.label}</span>
                          <span className="text-small text-secondary-midGray ml-auto truncate">
                            {item.jobStage}
                          </span>
                        </div>
                        <div className="p-4 space-y-2">
                          {renderContent(item)}
                          <div className="flex items-center gap-2 text-small text-secondary-midGray/60 font-mono">
                            <span className="truncate">{item.filePath}</span>
                            <span className="shrink-0">{fmtTime(item.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
