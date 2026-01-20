'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CalendarPlus } from 'lucide-react';
import type { Task } from '@shared/types';

interface TaskScheduleDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (
    task: Task,
    startTime: Date,
    endTime: Date
  ) => Promise<void>;
}

export function TaskScheduleDialog({
  task,
  open,
  onOpenChange,
  onSchedule,
}: TaskScheduleDialogProps) {
  const [startDateTime, setStartDateTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [isScheduling, setIsScheduling] = useState(false);

  // Set default start time when dialog opens
  useEffect(() => {
    if (open && task) {
      // Default to next hour
      const now = new Date();
      now.setMinutes(0, 0, 0);
      now.setHours(now.getHours() + 1);
      
      // Format for datetime-local input
      const formatted = formatDateTimeLocal(now);
      setStartDateTime(formatted);
      
      // Use task's planned duration if available, otherwise default to 60
      setDuration(String(task.planned_duration_minutes || 60));
    }
  }, [open, task]);

  const handleSchedule = async () => {
    if (!task || !startDateTime) return;

    setIsScheduling(true);
    try {
      const startTime = new Date(startDateTime);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + parseInt(duration, 10));

      await onSchedule(task, startTime, endTime);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to schedule task:', error);
    } finally {
      setIsScheduling(false);
    }
  };

  const endTimeDisplay = startDateTime
    ? formatTimeDisplay(
        new Date(
          new Date(startDateTime).getTime() + parseInt(duration, 10) * 60000
        )
      )
    : '';

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Schedule Task
          </DialogTitle>
          <DialogDescription className="text-left">
            Add "{task.title}" to your calendar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="schedule-datetime">Start Time</Label>
            <Input
              id="schedule-datetime"
              type="datetime-local"
              value={startDateTime}
              onChange={e => setStartDateTime(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule-duration">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="schedule-duration" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="180">3 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {startDateTime && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="text-muted-foreground">
                Event will be scheduled:
              </div>
              <div className="font-medium mt-1">
                {formatDateDisplay(new Date(startDateTime))}
              </div>
              <div className="text-muted-foreground">
                {formatTimeDisplay(new Date(startDateTime))} - {endTimeDisplay}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isScheduling}
            className="h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isScheduling || !startDateTime}
            className="h-11 min-w-[100px]"
          >
            {isScheduling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add to Calendar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatTimeDisplay(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default TaskScheduleDialog;
