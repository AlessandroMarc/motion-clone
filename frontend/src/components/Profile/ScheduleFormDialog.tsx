'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import type { Schedule } from '@/types';

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: Schedule | null;
  onSubmit: (data: {
    name: string;
    workingHoursStart: number;
    workingHoursEnd: number;
  }) => Promise<void>;
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  schedule,
  onSubmit,
}: ScheduleFormDialogProps) {
  const [scheduleName, setScheduleName] = useState('');
  const [workingHoursStart, setWorkingHoursStart] = useState(9);
  const [workingHoursEnd, setWorkingHoursEnd] = useState(22);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = !!schedule;

  useEffect(() => {
    if (open) {
      if (schedule) {
        setScheduleName(schedule.name);
        setWorkingHoursStart(schedule.working_hours_start);
        setWorkingHoursEnd(schedule.working_hours_end);
      } else {
        setScheduleName('');
        setWorkingHoursStart(9);
        setWorkingHoursEnd(22);
      }
    }
  }, [open, schedule]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: scheduleName || 'Default',
        workingHoursStart,
        workingHoursEnd,
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
      <DialogContent>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-hour">Start Hour</Label>
              <Select
                value={workingHoursStart.toString()}
                onValueChange={(value: string) =>
                  setWorkingHoursStart(Number(value))
                }
              >
                <SelectTrigger id="start-hour">
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-hour">End Hour</Label>
              <Select
                value={workingHoursEnd.toString()}
                onValueChange={(value: string) =>
                  setWorkingHoursEnd(Number(value))
                }
              >
                <SelectTrigger id="end-hour">
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









