import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';

export function openLoginDialog() {
  window.dispatchEvent(new CustomEvent('pd:login-dialog', { detail: { open: true } }));
}

function getInitials(user: { displayName?: string | null; email?: string | null }): string {
  const source = user.displayName || user.email || '';
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || '?';
}

export default function AuthStatus() {
  const { currentUser, logout, loading } = useAuth();

  if (!currentUser) {
    return (
      <Button variant="secondary" size="sm" className="w-full justify-center" onClick={openLoginDialog}>
        Sign in
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-secondary-borderGray bg-primary-dark/40 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span
          aria-hidden="true"
          className="w-7 h-7 shrink-0 rounded-full bg-accent-purple/20 text-accent-purple flex items-center justify-center text-small font-semibold"
        >
          {getInitials(currentUser)}
        </span>
        <span className="text-small text-secondary-midGray truncate min-w-0" title={currentUser.email ?? ''}>
          {currentUser.displayName || currentUser.email}
        </span>
      </div>
      <button
        type="button"
        onClick={() => logout()}
        disabled={loading}
        className="mt-2 w-full text-small text-secondary-midGray hover:text-semantic-dangerRed transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-orange/40 rounded px-1 py-0.5"
      >
        {loading ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
