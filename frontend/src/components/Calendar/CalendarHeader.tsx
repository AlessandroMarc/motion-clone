'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getWeekRangeString,
  getDayAbbreviation,
  getMonthDay,
} from '@/utils/calendarUtils';

interface CalendarHeaderProps {
  weekDates: Date[];
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onAutoSchedule?: () => void;
}

export function CalendarHeader({
  weekDates,
  onPreviousWeek,
  onNextWeek,
  onCurrentWeek,
  onAutoSchedule,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={onCurrentWeek}
          className="text-sm"
        >
          Today
        </Button>
        {onAutoSchedule && (
          <Button
            variant="default"
            size="sm"
            onClick={onAutoSchedule}
            className="text-sm cursor-pointer hover:bg-primary hover:text-white"  
          >
            Auto-Schedule Tasks
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={onPreviousWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-lg font-semibold min-w-[200px] text-center">
          {getWeekRangeString(weekDates)}
        </div>

        <Button variant="outline" size="sm" onClick={onNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface CalendarGridHeaderProps {
  weekDates: Date[];
}

export function CalendarGridHeader({ weekDates }: CalendarGridHeaderProps) {
  return (
    <div className="grid grid-cols-8 gap-px bg-border rounded-lg overflow-hidden">
      {/* Time column header */}
      <div className="bg-muted p-3 text-sm font-medium text-muted-foreground">
        Time
      </div>

      {/* Day headers */}
      {weekDates.map((date, index) => (
        <div key={index} className="bg-muted p-3 text-center">
          <div className="text-sm font-medium text-muted-foreground">
            {getDayAbbreviation(date)}
          </div>
          <div className="text-lg font-semibold">{getMonthDay(date)}</div>
        </div>
      ))}
    </div>
  );
}
