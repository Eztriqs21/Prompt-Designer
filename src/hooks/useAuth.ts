import { useAuthContextValue } from '../context/AuthContext';

export function useAuth() {
  return useAuthContextValue();
}
