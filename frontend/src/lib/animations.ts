import type { Transition, Variants } from 'framer-motion';

// Transition presets
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
};

export const springGentle: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 20,
};

export const easeFade: Transition = {
  duration: 0.2,
  ease: 'easeOut',
};

// Variants
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: easeFade },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15, ease: 'easeIn' } },
};

export const fadeInScale: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: easeFade },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: springGentle },
  exit: {
    opacity: 0,
    x: -16,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};
