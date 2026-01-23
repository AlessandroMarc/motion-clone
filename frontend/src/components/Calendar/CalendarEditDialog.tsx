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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash2, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DateTimePicker } from '@/components/forms/shared/DateTimePicker';

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
            <DialogTitle>Edit Taks Block</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="calendar-title">Title</Label>
              <Input
                id="calendar-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Event title"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DateTimePicker
                value={startTime}
                onChange={setStartTime}
                label="Start"
                id="calendar-start"
              />
              <DateTimePicker
                value={endTime}
                onChange={setEndTime}
                label="End"
                id="calendar-end"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendar-description">Description</Label>
              <Textarea
                id="calendar-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
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
                  {completed ? 'Task Completata' : 'Completa Task'}
                </Button>
                {completedAt && (
                  <p className="text-xs text-muted-foreground text-center">
                    Completata il:{' '}
                    {completedAt.toLocaleString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
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
