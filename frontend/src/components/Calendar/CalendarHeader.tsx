'use client';

import { ChevronLeft, ChevronRight, Sparkles, Circle } from 'lucide-react';
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
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-heading">Calendar</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCurrentWeek}
              className="text-xs h-8 px-3"
            >
              Today
            </Button>
            {onAutoSchedule && (
              <Button
                variant="default"
                size="sm"
                onClick={onAutoSchedule}
                className="text-xs h-8 px-3 gap-1.5"
                data-onboarding-step="schedule"
              >
                <Sparkles className="h-3 w-3" />
                Auto
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onPreviousDay}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center flex-1 px-4">
            <div className="text-xs text-muted-foreground">
              {dayName}
            </div>
            <div className="text-sm font-medium">
              {dayDate}
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={onNextDay}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Desktop view: show week navigation
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-heading">Calendar</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCurrentWeek}
          className="text-xs h-7 px-2.5"
        >
          Today
        </Button>
        {onAutoSchedule && (
          <Button
            size="sm"
            onClick={onAutoSchedule}
            className="text-xs h-7 px-2.5 gap-1.5"
            data-onboarding-step="schedule"
          >
            <Sparkles className="h-3 w-3" />
            Auto-Schedule
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onPreviousWeek} className="h-7 w-7">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-sm font-medium min-w-[160px] text-center text-muted-foreground">
          {getWeekRangeString(weekDates)}
        </div>

        <Button variant="ghost" size="icon" onClick={onNextWeek} className="h-7 w-7">
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
