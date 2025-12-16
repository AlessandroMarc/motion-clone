'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Task, CalendarEventTask, CalendarEventUnion } from '@shared/types';
import type { Schedule } from '@shared/types';
import { logger } from '@/lib/logger';
import { useAutoSchedulePreview } from './hooks/useAutoSchedulePreview';
import { AutoScheduleSummary } from './AutoScheduleSummary';
import { AutoScheduleTaskSections } from './AutoScheduleTaskSections';

interface AutoScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  existingEvents: CalendarEventTask[];
  allCalendarEvents: CalendarEventUnion[]; // All calendar events to avoid overlaps
  userId: string;
  activeSchedule: Schedule | null;
  onSchedule: (
    events: Array<{
      title: string;
      start_time: string;
      end_time: string;
      description?: string;
      linked_task_id: string;
      user_id: string;
    }>
  ) => Promise<void>;
}

export function AutoScheduleDialog({
  open,
  onOpenChange,
  tasks,
  existingEvents,
  allCalendarEvents,
  userId,
  activeSchedule,
  onSchedule,
}: AutoScheduleDialogProps) {
  const [eventDuration, setEventDuration] = useState<number>(60);
  const [isScheduling, setIsScheduling] = useState(false);

  const {
    taskEvents,
    totalEvents,
    totalViolations,
    tasksWithDeadlineCount,
    tasksWithoutDeadlineCount,
  } = useAutoSchedulePreview({
    tasks,
    existingEvents,
    allCalendarEvents,
    activeSchedule,
    eventDuration,
  });

  const handleSchedule = async () => {
    setIsScheduling(true);
    try {
      const eventsToCreate = taskEvents.flatMap(({ task, events }) =>
        events.map(event => ({
          title: task.title,
          start_time: event.start_time.toISOString(),
          end_time: event.end_time.toISOString(),
          description: task.description,
          linked_task_id: task.id,
          user_id: userId,
        }))
      );

      await onSchedule(eventsToCreate);
      onOpenChange(false);
    } catch (error) {
      logger.error('Failed to schedule tasks:', error);
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Auto-Schedule Tasks</DialogTitle>
          <DialogDescription>
            Automatically create calendar events for incomplete tasks based on
            their planned duration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Duration Selector */}
          <div className="space-y-2">
            <Label htmlFor="event-duration">Event Duration</Label>
            <Select
              value={eventDuration.toString()}
              onValueChange={(value: string) => setEventDuration(Number(value))}
            >
              <SelectTrigger id="event-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AutoScheduleSummary
            totalEvents={totalEvents}
            taskCount={taskEvents.length}
            totalViolations={totalViolations}
          />

          <AutoScheduleTaskSections
            taskEvents={taskEvents}
            tasksWithDeadlineCount={tasksWithDeadlineCount}
            tasksWithoutDeadlineCount={tasksWithoutDeadlineCount}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isScheduling}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isScheduling || totalEvents === 0}
          >
            {isScheduling ? 'Scheduling...' : 'Schedule All'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
