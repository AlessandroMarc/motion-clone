'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getWeekRangeString,
  getDayAbbreviation,
  getMonthDay,
} from '@/utils/calendarUtils';
import { useIsMobile } from '@/hooks/use-mobile';

interface CalendarHeaderProps {
  weekDates: Date[];
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onAutoSchedule?: () => void;
  // Mobile-specific props
  currentDay?: Date;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
}

export function CalendarHeader({
  weekDates,
  onPreviousWeek,
  onNextWeek,
  onCurrentWeek,
  onAutoSchedule,
  currentDay,
  onPreviousDay,
  onNextDay,
}: CalendarHeaderProps) {
  const isMobile = useIsMobile();

  // Mobile view: show single day navigation
  if (isMobile && currentDay && onPreviousDay && onNextDay) {
    const dayName = currentDay.toLocaleDateString('en-US', { weekday: 'long' });
    const dayDate = currentDay.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });

    return (
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Calendar</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCurrentWeek}
              className="text-xs h-9"
            >
              Today
            </Button>
            {onAutoSchedule && (
              <Button
                variant="default"
                size="sm"
                onClick={onAutoSchedule}
                className="text-xs h-9 cursor-pointer hover:bg-primary hover:text-white"  
              >
                Auto-Schedule
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onPreviousDay}
            className="h-9 w-9 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center flex-1 px-4">
            <div className="text-sm font-medium text-muted-foreground">
              {dayName}
            </div>
            <div className="text-lg font-semibold">
              {dayDate}
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={onNextDay}
            className="h-9 w-9 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Desktop view: show week navigation
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
