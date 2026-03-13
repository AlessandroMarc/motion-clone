'use client';

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
  completed?: boolean;
  onCompletedChange: (completed: boolean) => Promise<void> | void;
  onLinkClick: () => void;
  onDelete?: () => Promise<void> | void;
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
  completed,
  onCompletedChange,
  onClose,
  onLinkClick,
  onDelete,
}: {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isTaskEvent?: boolean;
  completed?: boolean;
  onCompletedChange: (completed: boolean) => Promise<void> | void;
  onClose: () => void;
  onLinkClick: () => void;
  onDelete?: () => Promise<void> | void;
}): React.ReactElement {
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
    console.log('Delete clicked');
    if (!onDelete) {
      console.warn('Delete function not provided');
      return;
    }

    const confirmed = window.confirm(
      'Delete this scheduled session? This cannot be undone.'
    );
    if (!confirmed) {
      console.log('Delete cancelled');
      return;
    }

    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
    }
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
              >
                ⌫
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
      </DialogFooter>
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
  completed = false,
  onCompletedChange,
  onLinkClick,
  onDelete,
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
          completed={completed}
          onCompletedChange={onCompletedChange}
          onClose={() => onOpenChange(false)}
          onLinkClick={onLinkClick}
          onDelete={onDelete}
        />
      </DialogContent>
    </Dialog>
  );
}

export default CalendarEditDialog;
