'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Trash2, CheckCircle2, Clock, FileText, AlignLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CalendarEventFormFields } from './CalendarEventFormFields';

interface CalendarEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  isTaskEvent?: boolean;
  completed?: boolean;
  completedAt?: Date | null;
  onCompletedChange?: (completed: boolean) => void;
  onSave: () => void;
  onDelete: () => void;
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

/** Read-only view for Google Calendar events. */
function GoogleEventDetails({
  title,
  description,
  startTime,
  endTime,
  onClose,
}: {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  onClose: () => void;
}): React.ReactElement {
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
            <p className="whitespace-pre-wrap">{description}</p>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </>
  );
}

/** Editable view for task events scheduled on the calendar. */
function TaskEventEdit({
  title,
  setTitle,
  description,
  setDescription,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  completed,
  completedAt,
  onCompletedChange,
  onSave,
  onDeleteClick,
  onClose,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  completed: boolean;
  completedAt?: Date | null;
  onCompletedChange?: (completed: boolean) => void;
  onSave: () => void;
  onDeleteClick: () => void;
  onClose: () => void;
}): React.ReactElement {
  const handleCompleteClick = () => {
    const newCompletedState = !completed;
    onCompletedChange?.(newCompletedState);

    if (newCompletedState) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit task event</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <CalendarEventFormFields
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          startTime={startTime}
          setStartTime={setStartTime}
          endTime={endTime}
          setEndTime={setEndTime}
          dateTimeDisabled
        />
        <div className="space-y-2">
          <Button
            type="button"
            variant={completed ? 'default' : 'outline'}
            onClick={handleCompleteClick}
            className="w-full gap-2"
          >
            <CheckCircle2
              className={`h-4 w-4 ${completed ? 'text-green-500' : ''}`}
            />
            {completed ? 'Task completed' : 'Complete task'}
          </Button>
          {completedAt && (
            <p className="text-xs text-muted-foreground text-center">
              Completed:{' '}
              {completedAt.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="destructive" onClick={onDeleteClick} className="gap-2">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!title || !startTime || !endTime}>
            Save
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

function CalendarEditDialog({
  open,
  onOpenChange,
  title,
  setTitle,
  description,
  setDescription,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  isTaskEvent = false,
  completed = false,
  completedAt,
  onCompletedChange,
  onSave,
  onDelete,
}: CalendarEditDialogProps): React.ReactElement {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    setDeleteDialogOpen(false);
    onDelete();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          {isTaskEvent ? (
            <TaskEventEdit
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              startTime={startTime}
              setStartTime={setStartTime}
              endTime={endTime}
              setEndTime={setEndTime}
              completed={completed}
              completedAt={completedAt}
              onCompletedChange={onCompletedChange}
              onSave={onSave}
              onDeleteClick={handleDeleteClick}
              onClose={() => onOpenChange(false)}
            />
          ) : (
            <GoogleEventDetails
              title={title}
              description={description}
              startTime={startTime}
              endTime={endTime}
              onClose={() => onOpenChange(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {isTaskEvent && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Event</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{title}&quot;? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

export default CalendarEditDialog;
