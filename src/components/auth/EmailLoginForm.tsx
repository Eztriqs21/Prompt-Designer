import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import TextInput from '../ui/TextInput';

type Mode = 'signin' | 'signup';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailLoginForm() {
  const { loginWithEmail, loading, error, clearError } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const validate = (): boolean => {
    if (!EMAIL_RE.test(email)) {
      setFieldError('Enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      setFieldError('Password must be at least 6 characters.');
      return false;
    }
    setFieldError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;
    clearError();
    await loginWithEmail({ email, password, mode });
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setFieldError(null);
    clearError();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <TextInput
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={Boolean(fieldError)}
        aria-describedby={fieldError ? 'email-error' : undefined}
        required
      />

      <TextInput
        label="Password"
        type="password"
        name="password"
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-invalid={Boolean(fieldError)}
        aria-describedby={fieldError ? 'email-error' : undefined}
        required
      />

      {fieldError && (
        <p id="email-error" role="alert" className="text-small text-semantic-dangerRed">
          {fieldError}
        </p>
      )}
      {error && !fieldError && (
        <p role="alert" className="text-small text-semantic-dangerRed">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" size="md" className="w-full" disabled={loading} aria-busy={loading}>
        {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
      </Button>

      <div className="text-center text-small text-secondary-midGray">
        {mode === 'signin' ? (
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className="text-accent-orange hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-orange/40 rounded"
          >
            Need an account? Sign up
          </button>
        ) : (
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className="text-accent-orange hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-orange/40 rounded"
          >
            Already have an account? Sign in
          </button>
        )}
      </div>
    </form>
  );
}
