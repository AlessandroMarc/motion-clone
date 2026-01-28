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
import { Trash2, CheckCircle2 } from 'lucide-react';
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
}: CalendarEditDialogProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    setDeleteDialogOpen(false);
    onDelete();
  };

  const handleCompleteClick = () => {
    const newCompletedState = !completed;
    onCompletedChange?.(newCompletedState);

    // Show confetti when completing the task
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit calendar event</DialogTitle>
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
            {isTaskEvent && (
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
            )}
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={onSave}
                disabled={!title || !startTime || !endTime}
              >
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{title}"? This action cannot be
              undone.
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
    </>
  );
}

export default CalendarEditDialog;
