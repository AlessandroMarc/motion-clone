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
import confetti from 'canvas-confetti';

interface CalendarEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isTaskEvent?: boolean;
  completed?: boolean;
  onCompletedChange?: (completed: boolean) => Promise<void> | void;
  onLinkClick?: () => void;
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
}: {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isTaskEvent?: boolean;
  completed?: boolean;
  onCompletedChange?: (completed: boolean) => Promise<void> | void;
  onClose: () => void;
  onLinkClick?: () => void;
}): React.ReactElement {
  const handleCompleteClick = async () => {
    const newCompletedState = !completed;

    try {
      // Await completion handler (it saves and closes the dialog)
      await onCompletedChange?.(newCompletedState);

      // Show confetti only for completion
      if (newCompletedState) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (error) {
      console.error('Failed to update task completion:', error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          {title || 'Untitled event'}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="flex items-start gap-3 text-sm">
          <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p>{formatDisplayTime(startTime)}</p>
            <p className="text-muted-foreground">
              to {formatDisplayTime(endTime)}
            </p>
          </div>
        </div>
        {description && (
          <div className="flex items-start gap-3 text-sm">
            <AlignLeft className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="whitespace-pre-wrap line-clamp-4">{description}</p>
          </div>
        )}
      </div>

      <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {isTaskEvent && (<>
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
          <Button variant="outline" onClick={onLinkClick} className="w-full sm:w-auto">
            🔗
          </Button>
        </>)}
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
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
  onLinkClick
}: CalendarEditDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
        />
      </DialogContent>
    </Dialog>
  );
}

export default CalendarEditDialog;
