'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fireConfetti } from '@/utils/confetti';
import { springSnappy } from '@/lib/animations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TaskCompletionDotProps {
  completed: boolean;
  onToggle: (nextCompleted: boolean) => Promise<void> | void;
  onPreviewChange?: (isPreviewingComplete: boolean) => void;
  className?: string;
  iconClassName?: string;
  disabled?: boolean;
}

const SHOULD_CONFIRM_COMPLETION =
  process.env.NEXT_PUBLIC_CONFIRM_TASK_COMPLETION !== '0';

export function TaskCompletionDot({
  completed,
  onToggle,
  onPreviewChange,
  className,
  iconClassName,
  disabled = false,
}: TaskCompletionDotProps): React.ReactElement {
  const [isHovering, setIsHovering] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const controls = useAnimationControls();
  const prevCompleted = useRef(completed);
  useEffect(() => {
    if (prevCompleted.current === false && completed === true) {
      void controls.start({ scale: [1, 1.3, 1], transition: springSnappy });
    } else {
      controls.set({ scale: 1 });
    }
    prevCompleted.current = completed;
  }, [completed, controls]);

  const isPreviewingComplete = !completed && isHovering;

  const ariaLabel = useMemo(() => {
    if (disabled) return 'Task completion disabled';
    return completed ? 'Mark task as incomplete' : 'Mark task as complete';
  }, [completed, disabled]);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (disabled) return;

    const nextCompleted = !completed;

    if (nextCompleted && SHOULD_CONFIRM_COMPLETION) {
      setConfirmOpen(true);
      return;
    }

    if (nextCompleted) fireConfetti();
    await onToggle(nextCompleted);
  };

  const handleConfirmComplete = async () => {
    try {
      setIsSubmitting(true);
      fireConfetti();
      await onToggle(true);
      setConfirmOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onMouseEnter={() => {
          setIsHovering(true);
          onPreviewChange?.(true);
        }}
        onMouseLeave={() => {
          setIsHovering(false);
          onPreviewChange?.(false);
        }}
        onFocus={() => {
          onPreviewChange?.(!completed);
        }}
        onBlur={() => {
          onPreviewChange?.(false);
        }}
        onClick={event => {
          void handleClick(event);
        }}
        disabled={disabled || isSubmitting}
        aria-label={ariaLabel}
        className={cn(
          'relative shrink-0 rounded-full p-0.5 transition-colors touch-manipulation',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          (disabled || isSubmitting) && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <motion.div animate={controls}>
          <Circle
            className={cn(
              'h-4 w-4 text-muted-foreground',
              completed && 'text-emerald-500',
              iconClassName
            )}
          />
        </motion.div>
        <AnimatePresence>
          {!completed && isPreviewingComplete && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <Check
                className={cn('h-3 w-3 text-muted-foreground', iconClassName)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the task as completed. You can reopen it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault();
                void handleConfirmComplete();
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Completing...' : 'Complete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
