'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { springSnappy } from '@/lib/animations';

interface SaveConfirmationProps {
  show: boolean;
}

export function SaveConfirmation({ show }: SaveConfirmationProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={springSnappy}
        >
          <Check className="h-4 w-4" />
          <span>Saved</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
