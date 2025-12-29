'use client';

import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Schedule } from '@shared/types';

interface ActiveScheduleCardProps {
  schedule: Schedule | null;
}

export function ActiveScheduleCard({ schedule }: ActiveScheduleCardProps) {
  if (!schedule) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No active schedule. Create one below.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-5 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
          <Clock className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-base">{schedule.name}</h3>
            <Badge variant="default">Active</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {schedule.working_hours_start}:00 - {schedule.working_hours_end}:00
          </p>
        </div>
      </div>
    </div>
  );
}







