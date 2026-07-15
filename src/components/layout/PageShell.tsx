import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { fadeIn } from '../../motion/presets';
import { transitionEnter } from '../../motion/presets';

interface PageShellProps {
  children: ReactNode;
}

export default function PageShell({ children }: PageShellProps) {
  const reducedMotion = useReducedMotionSafe();

  return (
    <motion.div
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      variants={fadeIn}
      transition={reducedMotion ? { duration: 0 } : transitionEnter}
    >
      {children}
    </motion.div>
  );
}
