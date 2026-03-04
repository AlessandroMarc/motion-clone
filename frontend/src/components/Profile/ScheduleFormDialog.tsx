'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DayOfWeek, DaySchedule, Schedule } from '@/types';
import { toast } from 'sonner';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayState {
  enabled: boolean;
  start: number;
  end: number;
}

function buildInitialDays(
  schedule: Schedule | null | undefined,
  defaultStart: number,
  defaultEnd: number
): DayState[] {
  return DAY_NAMES.map((_, dayIndex) => {
    if (schedule?.working_days) {
      const dayHours = schedule.working_days[dayIndex as DayOfWeek];
      if (dayHours === null || dayHours === undefined) {
        return { enabled: false, start: defaultStart, end: defaultEnd };
      }
      return { enabled: true, start: dayHours.start, end: dayHours.end };
    }
    // Legacy schedule without working_days: Mon-Fri enabled by default
    const enabled = dayIndex >= 1 && dayIndex <= 5;
    return { enabled, start: defaultStart, end: defaultEnd };
  });
}

export interface ScheduleFormData {
  name: string;
  workingHoursStart: number;
  workingHoursEnd: number;
  workingDays: Record<number, DaySchedule | null>;
}

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: Schedule | null;
  onSubmit: (data: ScheduleFormData) => Promise<void>;
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  schedule,
  onSubmit,
}: ScheduleFormDialogProps) {
  const [scheduleName, setScheduleName] = useState('');
  const [days, setDays] = useState<DayState[]>(() =>
    buildInitialDays(null, 9, 22)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = !!schedule;

  useEffect(() => {
    if (open) {
      if (schedule) {
        setScheduleName(schedule.name);
        setDays(
          buildInitialDays(
            schedule,
            schedule.working_hours_start,
            schedule.working_hours_end
          )
        );
      } else {
        setScheduleName('');
        setDays(buildInitialDays(null, 9, 22));
      }
    }
  }, [open, schedule]);

  const toggleDay = (dayIndex: number) => {
    setDays(prev =>
      prev.map((d, i) => (i === dayIndex ? { ...d, enabled: !d.enabled } : d))
    );
  };

  const setDayStart = (dayIndex: number, value: number) => {
    setDays(prev =>
      prev.map((d, i) => (i === dayIndex ? { ...d, start: value } : d))
    );
  };

  const setDayEnd = (dayIndex: number, value: number) => {
    setDays(prev =>
      prev.map((d, i) => (i === dayIndex ? { ...d, end: value } : d))
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Validate that all enabled days have start < end
      const invalidDays = days.filter(d => d.enabled && d.start >= d.end);
      if (invalidDays.length > 0) {
        toast.error('Start time must be before end time for all working days');
        return;
      }

      // Build working_days map
      const workingDays: Record<DayOfWeek, DaySchedule | null> = {} as Record<
        DayOfWeek,
        DaySchedule | null
      >;
      days.forEach((d, i) => {
        workingDays[i as DayOfWeek] = d.enabled
          ? { start: d.start, end: d.end }
          : null;
      });

      // Derive legacy fields from the first enabled day (for backward compat)
      const firstEnabled = days.find(d => d.enabled);
      const workingHoursStart = firstEnabled?.start ?? 9;
      const workingHoursEnd = firstEnabled?.end ?? 22;

      await onSubmit({
        name: scheduleName || 'Default',
        workingHoursStart,
        workingHoursEnd,
        workingDays,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit schedule:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Schedule' : 'Create New Schedule'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the working hours for this schedule.'
              : 'Create a new working hours schedule for task scheduling.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="schedule-name">Schedule Name</Label>
            <Input
              id="schedule-name"
              value={scheduleName}
              onChange={e => setScheduleName(e.target.value)}
              placeholder="e.g., Weekday, Weekend, Flexible"
            />
          </div>
          <div className="space-y-2">
            <Label>Working Days &amp; Hours</Label>
            <div className="space-y-2">
              {DAY_NAMES.map((dayName, dayIndex) => {
                const day = days[dayIndex] as DayState;
                return (
                  <div
                    key={dayIndex}
                    className="flex items-center gap-3 rounded-md border px-3 py-2"
                  >
                    <Checkbox
                      id={`day-${dayIndex}`}
                      checked={day.enabled}
                      onCheckedChange={() => toggleDay(dayIndex)}
                    />
                    <Label
                      htmlFor={`day-${dayIndex}`}
                      className="w-8 shrink-0 cursor-pointer text-sm font-medium"
                    >
                      {dayName}
                    </Label>
                    {day.enabled ? (
                      <div className="flex flex-1 items-center gap-2">
                        <Select
                          value={day.start.toString()}
                          onValueChange={v => setDayStart(dayIndex, Number(v))}
                        >
                          <SelectTrigger className="h-8 flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, '0')}:00
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground text-xs">–</span>
                        <Select
                          value={day.end.toString()}
                          onValueChange={v => setDayEnd(dayIndex, Number(v))}
                        >
                          <SelectTrigger className="h-8 flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(
                              { length: 24 },
                              (_, i) =>
                                i > day.start && (
                                  <SelectItem key={i} value={i.toString()}>
                                    {i.toString().padStart(2, '0')}:00
                                  </SelectItem>
                                )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <span className="flex-1 text-xs text-muted-foreground">
                        Not a working day
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
