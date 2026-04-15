'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, FileText, AlignLeft } from 'lucide-react';

interface CalendarEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isTaskEvent?: boolean;
  isSyncedFromGoogle?: boolean;
  completed?: boolean;
  onCompletedChange: (completed: boolean) => Promise<void> | void;
  onLinkClick: () => void;
  onDelete?: () => Promise<void> | void;
  onEditGoogleEvent?: () => void;
  onDeleteGoogleEvent?: () => void;
}

function formatDisplayTime(isoLocalString: string): string {
  if (!isoLocalString) return '';
  const date = new Date(isoLocalString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Read-only view for Google Calendar events & Tasks (Google format). */
function GoogleEventDetails({
  title,
  description,
  startTime,
  endTime,
  isTaskEvent,
  isSyncedFromGoogle,
  completed,
  onCompletedChange,
  onClose,
  onLinkClick,
  onDelete,
  onEditGoogleEvent,
  onDeleteGoogleEvent,
}: {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isTaskEvent?: boolean;
  isSyncedFromGoogle?: boolean;
  completed?: boolean;
  onCompletedChange: (completed: boolean) => Promise<void> | void;
  onClose: () => void;
  onLinkClick: () => void;
  onDelete?: () => Promise<void> | void;
  onEditGoogleEvent?: () => void;
  onDeleteGoogleEvent?: () => void;
}): React.ReactElement {
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCompleteClick = async () => {
    const newCompletedState = !completed;

    try {
      // Note: confetti is now handled by useCalendarDialogs (after checking
      // for multi-session prompts). No need to fire it here.
      await onCompletedChange?.(newCompletedState);
    } catch (error) {
      console.error('Failed to update task completion:', error);
    }
  };

  const handleDeleteClick = async () => {
    if (!onDelete) return;
    try {
      await onDelete();
      onClose();
      setDeleteError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error deleting session';
      setDeleteError(message);
      console.error(
        `[CalendarEditDialog] delete failed (onDelete=${Boolean(
          onDelete
        )}, onClose=${Boolean(onClose)}):`,
        err
      );
    }
  };

  const handleDeleteConfirm = async () => {
    // No longer used — delete button calls handleDeleteClick directly
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-start gap-2 pr-8 break-words">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          {title || 'Untitled event'}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="flex items-start gap-3 text-sm">
          <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p>{formatDisplayTime(startTime)}</p>
            <p className="text-muted-foreground">
              to {formatDisplayTime(endTime)}
            </p>
          </div>
        </div>
        {description && (
          <div className="flex items-start gap-3 text-sm">
            <AlignLeft className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="min-w-0 whitespace-pre-wrap break-all overflow-y-auto line-clamp-8">
              {description}
            </p>
          </div>
        )}
      </div>

      <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {isTaskEvent && (
          <>
            <Button
              type="button"
              variant={completed ? 'default' : 'outline'}
              onClick={handleCompleteClick}
              className="w-full sm:flex-1 gap-2"
            >
              <CheckCircle2
                className={`h-4 w-4 ${completed ? 'text-green-500' : ''}`}
              />
              {completed ? 'Task completed' : 'Complete task'}
            </Button>
            <Button
              variant="outline"
              onClick={onLinkClick}
              className="w-full sm:w-auto"
            >
              🔗
            </Button>
            {onDelete && (
              <Button
                variant="destructive"
                onClick={handleDeleteClick}
                className="w-full sm:w-auto"
                aria-label="Delete session"
              >
                ⌫
              </Button>
            )}
          </>
        )}
        {!isTaskEvent && isSyncedFromGoogle && (
          <>
            {onEditGoogleEvent && (
              <Button
                variant="outline"
                onClick={onEditGoogleEvent}
                className="w-full sm:flex-1"
              >
                Edit
              </Button>
            )}
            {onDeleteGoogleEvent && (
              <Button
                variant="destructive"
                onClick={onDeleteGoogleEvent}
                className="w-full sm:w-auto"
              >
                Delete
              </Button>
            )}
          </>
        )}
        <Button
          variant="outline"
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          Close
        </Button>
        {deleteError ? (
          <p className="text-sm text-destructive mt-2 w-full" role="alert">
            {deleteError}
          </p>
        ) : null}
      </DialogFooter>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>
              This scheduled session will be permanently deleted. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CalendarEditDialog({
  open,
  onOpenChange,
  title,
  description,
  startTime,
  endTime,
  isTaskEvent = false,
  isSyncedFromGoogle = false,
  completed = false,
  onCompletedChange,
  onLinkClick,
  onDelete,
  onEditGoogleEvent,
  onDeleteGoogleEvent,
}: CalendarEditDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <GoogleEventDetails
          title={title}
          description={description}
          startTime={startTime}
          endTime={endTime}
          isTaskEvent={isTaskEvent}
          isSyncedFromGoogle={isSyncedFromGoogle}
          completed={completed}
          onCompletedChange={onCompletedChange}
          onClose={() => onOpenChange(false)}
          onLinkClick={onLinkClick}
          onDelete={onDelete}
          onEditGoogleEvent={onEditGoogleEvent}
          onDeleteGoogleEvent={onDeleteGoogleEvent}
        />
      </DialogContent>
    </Dialog>
  );
}

export default CalendarEditDialog;
