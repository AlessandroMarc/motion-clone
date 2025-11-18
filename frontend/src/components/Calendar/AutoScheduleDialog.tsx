'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type {
  Task,
  CalendarEventTask,
  CalendarEventUnion,
} from '@/../../../shared/types';
import { isCalendarEventTask } from '@/../../../shared/types';
import {
  type TaskSchedulingConfig,
  DEFAULT_CONFIG,
  prepareTaskEvents,
  sortTasksForScheduling,
} from '@/utils/taskScheduler';

interface AutoScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  existingEvents: CalendarEventTask[];
  allCalendarEvents: CalendarEventUnion[]; // All calendar events to avoid overlaps
  userId: string;
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
  onSchedule,
}: AutoScheduleDialogProps) {
  const [eventDuration, setEventDuration] = useState<number>(60);
  const [isScheduling, setIsScheduling] = useState(false);

  // Filter tasks that need scheduling: only those with actual duration less than planned duration
  // This includes tasks that are not-started (actual = 0) or in-progress (actual < planned)
  const incompleteTasks = useMemo(
    () =>
      tasks.filter(
        task =>
          task.status !== 'completed' &&
          (task.actual_duration_minutes ?? 0) < task.planned_duration_minutes
      ),
    [tasks]
  );

  // Sort tasks for scheduling
  const sortedTasks = useMemo(
    () => sortTasksForScheduling(incompleteTasks),
    [incompleteTasks]
  );

  // Group tasks by deadline status
  const tasksWithDeadline = useMemo(
    () => sortedTasks.filter(task => task.due_date !== null),
    [sortedTasks]
  );
  const tasksWithoutDeadline = useMemo(
    () => sortedTasks.filter(task => task.due_date === null),
    [sortedTasks]
  );

  // Prepare events for all tasks
  // Important: We process tasks sequentially and accumulate scheduled events
  // to avoid overlaps between events created in the same batch
  // Events are scheduled consecutively starting from now (rounded to next 15 minutes)
  const taskEvents = useMemo(() => {
    const config: TaskSchedulingConfig = {
      ...DEFAULT_CONFIG,
      eventDurationMinutes: eventDuration,
    };

    const allEvents: Array<{
      task: Task;
      events: Array<{ start_time: Date; end_time: Date }>;
      violations: Array<{ start_time: Date; end_time: Date }>;
    }> = [];

    // Start from now, rounded to next 15 minutes
    const startFrom = new Date();
    const minutes = startFrom.getMinutes();
    const remainder = minutes % 15;
    if (remainder === 0) {
      startFrom.setMinutes(minutes + 15);
    } else {
      startFrom.setMinutes(minutes + (15 - remainder));
    }
    startFrom.setSeconds(0);
    startFrom.setMilliseconds(0);

    // Filter events:
    // 1. Completed task events - should not be deleted, but also don't block scheduling
    // 2. Non-task events (regular calendar events) - should not be deleted, and DO block scheduling
    // 3. Non-completed task events - will be deleted, so should NOT block scheduling
    const completedTaskEvents = allCalendarEvents.filter(
      event => isCalendarEventTask(event) && event.completed_at !== null
    );
    const regularEvents = allCalendarEvents.filter(
      event => !isCalendarEventTask(event)
    );
    const nonCompletedTaskEvents = allCalendarEvents.filter(
      event => isCalendarEventTask(event) && !event.completed_at
    );

    // Accumulate scheduled events as we process each task
    // Start with regular events (non-task events) and completed task events
    // Non-completed task events will be deleted, so they don't block scheduling
    const accumulatedScheduledEvents: CalendarEventUnion[] = [
      ...regularEvents,
      ...completedTaskEvents,
    ];
    let currentStartTime = new Date(startFrom);

    for (const task of sortedTasks) {
      // Only consider completed events when calculating required events
      // Non-completed events will be deleted before rescheduling
      const taskExistingEvents = existingEvents.filter(
        event => event.linked_task_id === task.id && event.completed_at !== null // Only count completed events
      );
      const { events, violations } = prepareTaskEvents(
        task,
        taskExistingEvents,
        config,
        accumulatedScheduledEvents,
        currentStartTime
      );

      if (events.length > 0) {
        allEvents.push({ task, events, violations });

        // Add the newly scheduled events to the accumulated list
        events.forEach(event => {
          accumulatedScheduledEvents.push({
            id: `temp-${task.id}-${event.start_time.getTime()}`,
            title: task.title,
            start_time: event.start_time,
            end_time: event.end_time,
            description: task.description,
            user_id: task.user_id,
            created_at: new Date(),
            updated_at: new Date(),
          } as CalendarEventUnion);
        });

        // Update current start time to end of last event + gap for next task
        const lastEvent = events[events.length - 1];
        currentStartTime = new Date(lastEvent.end_time);
        currentStartTime.setMinutes(currentStartTime.getMinutes() + 5); // 5 minute gap
      }
    }

    return allEvents;
  }, [sortedTasks, existingEvents, allCalendarEvents, eventDuration]);

  const totalEvents = useMemo(
    () => taskEvents.reduce((sum, te) => sum + te.events.length, 0),
    [taskEvents]
  );

  const totalViolations = useMemo(
    () => taskEvents.reduce((sum, te) => sum + te.violations.length, 0),
    [taskEvents]
  );

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
      console.error('Failed to schedule tasks:', error);
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

          {/* Summary */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <span className="font-medium">
                {totalEvents} events will be created for {taskEvents.length}{' '}
                tasks
              </span>
            </div>
            {totalViolations > 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">
                  {totalViolations} events scheduled after deadline
                </span>
              </div>
            )}
          </div>

          {/* Tasks with Deadline */}
          {tasksWithDeadline.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">
                Tasks with Deadline ({tasksWithDeadline.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {taskEvents
                  .filter(te => te.task.due_date !== null)
                  .map(({ task, events, violations }) => (
                    <div
                      key={task.id}
                      className="p-3 border rounded-lg space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {events.length} events
                          </Badge>
                          {violations.length > 0 && (
                            <Badge
                              variant="destructive"
                              className="text-xs flex items-center gap-1"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              {violations.length} after deadline
                            </Badge>
                          )}
                        </div>
                      </div>
                      {task.due_date && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Tasks without Deadline */}
          {tasksWithoutDeadline.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">
                Tasks without Deadline ({tasksWithoutDeadline.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {taskEvents
                  .filter(te => te.task.due_date === null)
                  .map(({ task, events }) => (
                    <div
                      key={task.id}
                      className="p-3 border rounded-lg space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {task.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {events.length} events
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {taskEvents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No events to create. All tasks are either completed or already
              fully scheduled.
            </div>
          )}
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
