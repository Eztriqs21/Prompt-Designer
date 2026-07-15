import { useReducedMotion } from 'framer-motion';

export function useReducedMotionSafe(): boolean {
  const prefersReduced = useReducedMotion();
  return prefersReduced ?? false;
}
