'use client';

import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Edit2 } from 'lucide-react';
import type { Schedule } from '@/types';

interface ScheduleCardProps {
  schedule: Schedule;
  isActive: boolean;
  onSetActive: (scheduleId: string) => void;
  onEdit: (schedule: Schedule) => void;
}

export function ScheduleCard({
  schedule,
  isActive,
  onSetActive,
  onEdit,
}: ScheduleCardProps) {
  return (
    <div className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-muted/30 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:p-5">
      <div className="flex items-center gap-3 flex-1 min-w-0 sm:gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
          <Clock className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-medium text-base">{schedule.name}</h3>
            {schedule.is_default && <Badge variant="outline">Default</Badge>}
            {isActive && <Badge variant="default">Active</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {String(schedule.working_hours_start).padStart(2, '0')}:00 -{' '}
            {String(schedule.working_hours_end).padStart(2, '0')}:00
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 sm:ml-4 self-end sm:self-auto">
        {!isActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSetActive(schedule.id)}
            className="touch-manipulation"
          >
            <Check className="mr-2 h-4 w-4" />
            Set Active
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(schedule)}
          className="touch-manipulation"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
