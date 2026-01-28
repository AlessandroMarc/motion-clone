'use client';

import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Schedule } from '@/types';

interface ActiveScheduleCardProps {
  schedule: Schedule | null;
}

export function ActiveScheduleCard({ schedule }: ActiveScheduleCardProps) {
  if (!schedule) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No active schedule. Create one below.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30 sm:gap-4 sm:p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground sm:h-12 sm:w-12">
        <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h3 className="font-semibold text-base">{schedule.name}</h3>
          <Badge variant="default">Active</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {String(schedule.working_hours_start).padStart(2, '0')}:00 -{' '}
          {String(schedule.working_hours_end).padStart(2, '0')}:00
        </p>
      </div>
    </div>
  );
}
