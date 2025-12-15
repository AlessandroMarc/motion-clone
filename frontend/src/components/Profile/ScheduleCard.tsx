'use client';

import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Edit2 } from 'lucide-react';
import type { Schedule } from '@/../../../shared/types';

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
    <div className="flex items-center justify-between p-5 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
          <Clock className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-base">{schedule.name}</h3>
            {schedule.is_default && <Badge variant="outline">Default</Badge>}
            {isActive && <Badge variant="default">Active</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {schedule.working_hours_start}:00 - {schedule.working_hours_end}:00
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {!isActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSetActive(schedule.id)}
          >
            <Check className="mr-2 h-4 w-4" />
            Set Active
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => onEdit(schedule)}>
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}



