'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/animations';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      className="flex flex-col flex-1 min-h-0"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  );
}
