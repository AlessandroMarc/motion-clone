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
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, Calendar } from 'lucide-react';
import type { Task, CalendarEventTask, CalendarEventUnion } from '@/types';
import type { Schedule } from '@/types';
import { logger } from '@/lib/logger';
import { useAutoSchedulePreview } from './hooks/useAutoSchedulePreview';
import { AutoScheduleSummary } from './AutoScheduleSummary';
import { AutoScheduleTaskSections } from './AutoScheduleTaskSections';
import { useOnboarding } from '@/hooks/useOnboarding';

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

type SchedulingPhase = 'idle' | 'preparing' | 'deleting' | 'creating' | 'done';

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
  const [schedulingPhase, setSchedulingPhase] =
    useState<SchedulingPhase>('idle');
  const [schedulingProgress, setSchedulingProgress] = useState(0);
  const [schedulingMessage, setSchedulingMessage] = useState('');
  const { advanceToNextStep } = useOnboarding();

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
    setSchedulingPhase('preparing');
    setSchedulingProgress(0);
    setSchedulingMessage('Preparing to schedule...');

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

      // Update progress phases
      setSchedulingPhase('deleting');
      setSchedulingProgress(20);
      setSchedulingMessage('Clearing previous schedule...');

      // Small delay to show the phase change
      await new Promise(resolve => setTimeout(resolve, 300));

      setSchedulingPhase('creating');
      setSchedulingProgress(40);
      setSchedulingMessage(`Creating ${eventsToCreate.length} events...`);

      await onSchedule(eventsToCreate);

      setSchedulingPhase('done');
      setSchedulingProgress(100);
      setSchedulingMessage('Schedule complete!');

      // Advance onboarding step if in onboarding flow
      try {
        await advanceToNextStep('schedule');
      } catch (error) {
        // Silently fail - onboarding advancement is not critical
        console.error('Failed to advance onboarding step:', error);
      }

      // Show completion state briefly before closing
      await new Promise(resolve => setTimeout(resolve, 800));

      onOpenChange(false);
    } catch (error) {
      logger.error('Failed to schedule tasks:', error);
      setSchedulingMessage('Failed to schedule. Please try again.');
    } finally {
      setIsScheduling(false);
      setSchedulingPhase('idle');
      setSchedulingProgress(0);
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

        <DialogFooter className="flex-col sm:flex-row gap-3">
          {isScheduling && (
            <div className="w-full space-y-2 sm:flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {schedulingPhase === 'done' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 animate-in zoom-in duration-200" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span>{schedulingMessage}</span>
              </div>
              <Progress value={schedulingProgress} className="h-1.5" />
            </div>
          )}
          <div className="flex gap-2 w-full sm:w-auto justify-end">
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
              className="min-w-[120px]"
            >
              {isScheduling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule All
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
