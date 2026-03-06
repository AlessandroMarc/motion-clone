'use client';

import { useMemo, useState } from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
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

    await onToggle(nextCompleted);
  };

  const handleConfirmComplete = async () => {
    try {
      setIsSubmitting(true);
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
        <Circle
          className={cn(
            'h-4 w-4 text-muted-foreground',
            completed && 'text-emerald-500',
            iconClassName
          )}
        />
        {!completed && (
          <Check
            className={cn(
              'absolute inset-0 m-auto h-3 w-3 text-muted-foreground transition-opacity',
              isPreviewingComplete ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}
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
