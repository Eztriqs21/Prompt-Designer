import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../ui/Toast';

interface Command {
  id: string;
  label: string;
  category: 'Chat' | 'Audit' | 'History' | 'System';
  tags?: string[];
  run: () => void;
}

const LAST_FIX_KEY = 'pd:lastAuditFixPrompt';

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = text.toLowerCase();
  let i = 0;
  for (const ch of hay) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return i === q.length;
}

export default function CommandPalette() {
  const navigate = useNavigate();
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ open?: boolean }>).detail;
      setOpen(detail?.open ?? true);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pd:command-palette', onOpen as EventListener);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pd:command-palette', onOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const lastFix = typeof window !== 'undefined' ? localStorage.getItem(LAST_FIX_KEY) : null;

  const commands: Command[] = useMemo(() => {
    const base: Command[] = [
      {
        id: 'new-chat',
        label: 'New Chat',
        category: 'Chat',
        tags: ['create', 'message', 'prompt'],
        run: () => navigate('/chat'),
      },
      {
        id: 'open-chat',
        label: 'Open Chat Workspace',
        category: 'Chat',
        tags: ['workspace', 'prompt'],
        run: () => navigate('/chat'),
      },
      {
        id: 'open-audit',
        label: 'Open Website AUDIT',
        category: 'Audit',
        tags: ['audit', 'website', 'qa'],
        run: () => navigate('/audit'),
      },
      {
        id: 'start-recommended',
        label: 'Start Recommended Audit',
        category: 'Audit',
        tags: ['audit', 'recommended', 'mode'],
        run: () => navigate('/audit', { state: { mode: 'recommended' } }),
      },
      {
        id: 'start-full',
        label: 'Start Full Audit',
        category: 'Audit',
        tags: ['audit', 'full', 'mode'],
        run: () => navigate('/audit', { state: { mode: 'full' } }),
      },
      {
        id: 'open-history',
        label: 'Open History',
        category: 'History',
        tags: ['history', 'saved', 'sessions'],
        run: () => navigate('/history'),
      },
    ];
    if (lastFix) {
      base.push({
        id: 'copy-fix',
        label: 'Copy last audit fix prompt',
        category: 'System',
        tags: ['copy', 'fix', 'agent', 'clipboard'],
        run: () => {
          navigator.clipboard?.writeText(lastFix).then(
            () => show('Last audit fix prompt copied'),
            () => {},
          );
        },
      });
    }
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, lastFix, show]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    return commands.filter((c) =>
      fuzzyMatch(query, `${c.label} ${c.category} ${c.tags?.join(' ') ?? ''}`),
    );
  }, [commands, query]);

  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered, active]);

  const execute = (cmd?: Command) => {
    const target = cmd ?? filtered[active];
    if (!target) return;
    setOpen(false);
    target.run();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (filtered.length ? (a + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (filtered.length ? (a - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      execute();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  if (!open) return null;

  const categories = ['Chat', 'Audit', 'History', 'System'] as const;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center pt-[12vh] bg-primary-dark/70"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      role="presentation"
    >
      <div
        className="w-[560px] max-w-[92vw] bg-secondary-darkSurface border border-secondary-borderGray text-primary-light rounded-md shadow-lg overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
      >
        <div className="p-3 border-b border-secondary-borderGray">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Type a command…"
            className="w-full bg-secondary-darkSurface text-primary-light placeholder:text-secondary-midGray border border-secondary-borderGray rounded-md px-3 py-2 text-body outline-none focus:border-accent-orange"
            aria-label="Search commands"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-small text-secondary-midGray">No matching commands</div>
          )}
          {categories.map((cat) => {
            const items = filtered.filter((c) => c.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="mb-1">
                <div className="px-4 py-1 text-small text-secondary-midGray">{cat}</div>
                {items.map((cmd) => {
                  const idx = filtered.indexOf(cmd);
                  const isActive = idx === active;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => execute(cmd)}
                      className={`w-full text-left px-4 py-2 text-body flex items-center justify-between transition-colors duration-150 ${
                        isActive ? 'bg-primary-light/10 text-primary-light' : 'text-primary-light hover:bg-primary-light/5'
                      }`}
                    >
                      <span>{cmd.label}</span>
                      {isActive && <span className="text-small text-secondary-midGray">↵</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-secondary-borderGray text-small text-secondary-midGray">
          ↑↓ navigate · ↵ select · esc close
        </div>
      </div>
    </div>
  );
}
