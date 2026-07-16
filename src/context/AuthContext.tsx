import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';

export interface AuthContextValue {
  currentUser: User | null;
  authReady: boolean;
  loading: boolean;
  error: string | null;
  loginWithEmail: (params: { email: string; password: string; mode: 'signin' | 'signup' }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function describeAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled.';
    case 'auth/cancelled-popup-request':
      return 'Another sign-in was started. Please try again.';
    case 'auth/popup-blocked':
      return 'Pop-up blocked by the browser. Allow pop-ups and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in Firebase (Authentication → Sign-in method).';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized. Add it under Authentication → Settings → Authorized domains.';
    case 'auth/account-exists-with-different-credential':
      return 'This email is already linked to another sign-in method. Try that method instead.';
    case 'auth/configuration-not-found':
      return 'This sign-in method is not enabled in Firebase.';
    case 'auth/internal-error':
      return 'Firebase internal error — check the OAuth consent screen configuration in the Google Cloud console.';
    default:
      return `Sign-in failed (${code || 'unknown error'}). Check the Firebase console: Google sign-in enabled, OAuth consent screen configured, and this domain authorized.`;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(!isFirebaseConfigured);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  const loginWithEmail = useCallback(
    async ({ email, password, mode }: { email: string; password: string; mode: 'signin' | 'signup' }) => {
      if (!auth) {
        setError('Auth is not configured.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (mode === 'signup') {
          await createUserWithEmailAndPassword(auth, email, password);
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
      } catch (err) {
        console.error('[auth] Email sign-in failed:', err);
        setError(describeAuthError(err));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextValue = {
    currentUser,
    authReady,
    loading,
    error,
    loginWithEmail,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContextValue(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContextValue must be used within AuthProvider');
  }
  return ctx;
}
