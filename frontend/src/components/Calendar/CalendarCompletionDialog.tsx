'use client';

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

interface CalendarCompletionDialogProps {
  open: boolean;
  onChoice: (choice: 'session' | 'task') => void;
  onCancel: () => void;
  sessionCount: number;
  isRecurring?: boolean;
}

export function CalendarCompletionDialog({
  open,
  onChoice,
  onCancel,
  sessionCount,
  isRecurring,
}: CalendarCompletionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={o => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Complete task?</AlertDialogTitle>
          <AlertDialogDescription>
            This task has {sessionCount} scheduled{' '}
            {sessionCount === 1 ? 'session' : 'sessions'}. Do you want to
            complete only this session or the entire task?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            onClick={() => onChoice('session')}
          >
            This session only
          </AlertDialogAction>
          {!isRecurring && (
            <AlertDialogAction onClick={() => onChoice('task')}>
              Complete entire task
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
