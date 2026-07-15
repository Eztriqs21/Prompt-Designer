import type { Variants, Transition } from 'framer-motion';

const DUR = {
  instant: 0.01,
  micro: 0.15,
  fast: 0.2,
  normal: 0.3,
  enter: 0.4,
} as const;

const EASE = {
  out: 'easeOut',
  inOut: 'easeInOut',
} as const;

const springSnappy: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
  mass: 0.8,
};

const springGentle: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 24,
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
};

export const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 12 },
  visible: { opacity: 1, x: 0 },
};

export const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0 },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export const expandCollapse: Variants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: 'auto', opacity: 1 },
};

export const navSlideDown: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
};

export const hoverLift = {
  whileHover: { y: -3, scale: 1.01 },
  whileTap: { scale: 0.98 },
  transition: { duration: DUR.micro, ease: EASE.out },
};

export const hoverLiftSubtle = {
  whileHover: { y: -2, scale: 1.005 },
  whileTap: { scale: 0.985 },
  transition: { duration: DUR.micro, ease: EASE.out },
};

export const hoverScale = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
  transition: { duration: DUR.micro, ease: EASE.out },
};

export const hoverScaleSmall = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { duration: DUR.micro, ease: EASE.out },
};

export const transitionFast: Transition = { duration: DUR.fast, ease: EASE.out };
export const transitionNormal: Transition = { duration: DUR.normal, ease: EASE.out };
export const transitionEnter: Transition = { duration: DUR.enter, ease: EASE.out };
export const transitionSnappy = springSnappy;
export const transitionGentle = springGentle;

export const DURATIONS = DUR;
export const EASINGS = EASE;
