import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, ShieldCheck, Clock, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: MessageSquare },
  { path: '/chat', label: 'Chat Workspace', icon: MessageSquare },
  { path: '/audit', label: 'Website AUDIT', icon: ShieldCheck },
  { path: '/history', label: 'History', icon: Clock },
];

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navContent = (
    <nav className="flex flex-col h-full">
      {/* Product name */}
      <div className="px-5 py-6 shrink-0">
        <h1 className="text-lg font-bold tracking-tight text-accent-blue">
          Prompt Designer
        </h1>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-secondary-borderGray" />

      {/* Navigation items */}
      <div className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium border-l-2 transition-colors duration-150 ${
                    active
                      ? 'bg-secondary-darkSurface text-primary-light border-accent-blue'
                      : 'text-secondary-midGray border-transparent hover:text-primary-light hover:bg-primary-light/5'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 shrink-0">
        <div className="h-px bg-secondary-borderGray mb-4" />
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('pd:command-palette', { detail: { open: true } }))}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-small text-secondary-midGray border border-secondary-borderGray hover:text-primary-light hover:border-accent-blue transition-colors duration-150"
        >
          <span>Command Palette</span>
          <span className="text-secondary-midGray">⌘K</span>
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-secondary-darkSurface border border-secondary-borderGray text-secondary-midGray hover:text-accent-blue transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-primary-dark/70"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-y-0 left-0 z-50 w-[260px] bg-secondary-darkSurface border-r border-secondary-borderGray">
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-md text-secondary-midGray hover:text-accent-blue transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
          {navContent}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] shrink-0 h-screen sticky top-0 bg-secondary-darkSurface border-r border-secondary-borderGray">
        {navContent}
      </aside>
    </>
  );
}
