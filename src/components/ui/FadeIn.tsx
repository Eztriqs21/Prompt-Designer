import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface FadeInProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  delay?: number;
  y?: number;
  children?: ReactNode;
}

export default function FadeIn({ delay = 0, y = 6, children, ...rest }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut', delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
