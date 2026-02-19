'use client';

import React, { useRef, useCallback } from 'react';
import type { CalendarEventUnion, Task } from '@/types';
import { isCalendarEventTask } from '@/types';
import { formatEventTime } from '@/utils/calendarUtils';
import { formatDateLong } from '@/utils/dateUtils';
import { CheckCircle2, Sparkles, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MobileDayScrollViewProps {
  dates: Date[];
  eventsByDay: Record<string, CalendarEventUnion[]>;
  onEventClick: (event: CalendarEventUnion) => void;
  tasksMap: Map<string, Task>;
  onToday: () => void;
  onAutoSchedule?: () => void;
  onZenMode?: () => void;
}

function formatEventTimeSafe(start: string | Date, end: string | Date): string {
  return formatEventTime(new Date(start), new Date(end));
}

export function MobileDayScrollView({
  dates,
  eventsByDay,
  onEventClick,
  tasksMap,
  onToday,
  onAutoSchedule,
  onZenMode,
}: MobileDayScrollViewProps): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleToday = useCallback(() => {
    onToday();
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [onToday]);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Minimal header: title + actions */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h1 className="text-lg font-heading">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToday}
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
          {onZenMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onZenMode}
              className="text-xs h-8 px-3 gap-1.5"
              title="Zen Mode"
            >
              <Circle className="h-3 w-3" />
              Zen
            </Button>
          )}
        </div>
      </div>

      {/* Vertically scrolling list of days — zen-style, days continue */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto -mx-2 px-2">
        {dates.map((date, index) => {
          const dayKey = `day-${index}`;
          const dayEvents = (eventsByDay[dayKey] ?? []).slice().sort((a, b) => {
            const tA = new Date(a.start_time).getTime();
            const tB = new Date(b.start_time).getTime();
            return tA - tB;
          });
          const isTodayDate =
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate();

          return (
            <section
              key={dayKey}
              id={isTodayDate ? 'today' : undefined}
              className="mb-10"
            >
              <h2
                className={cn(
                  'text-xl font-title mb-4 pb-2 border-b border-border/50',
                  isTodayDate && 'text-primary'
                )}
              >
                {formatDateLong(date)}
                {isTodayDate && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Today
                  </span>
                )}
              </h2>

              {dayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body">
                  No events
                </p>
              ) : (
                <ul className="space-y-3 list-none">
                  {dayEvents.map(event => {
                    const isTaskEvent = isCalendarEventTask(event);
                    const task = isTaskEvent
                      ? tasksMap.get(
                          (event as { linked_task_id?: string })
                            .linked_task_id ?? ''
                        )
                      : undefined;
                    const isCompleted =
                      isTaskEvent &&
                      !!(event as { completed_at?: string | null })
                        .completed_at;
                    const eventEnd = new Date(event.end_time);
                    const isPast = eventEnd < new Date();
                    const isAfterDeadline =
                      isTaskEvent &&
                      task?.due_date &&
                      new Date(event.start_time) >
                        new Date(
                          new Date(task.due_date).setHours(23, 59, 59, 999)
                        );

                    return (
                      <li key={event.id}>
                        <button
                          type="button"
                          onClick={() => onEventClick(event)}
                          className={cn(
                            'w-full text-left rounded-lg px-4 py-3 transition-colors',
                            'border border-border/50 hover:border-border',
                            isTaskEvent
                              ? isAfterDeadline
                                ? 'bg-red-500/10 border-red-500/30'
                                : isCompleted
                                  ? 'bg-muted/50'
                                  : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                              : 'bg-muted/30 hover:bg-muted/50',
                            isPast && !isCompleted && 'opacity-60'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-xs font-medium text-muted-foreground shrink-0 mt-0.5">
                              {formatEventTimeSafe(
                                event.start_time,
                                event.end_time
                              )}
                            </span>
                            <span
                              className={cn(
                                'flex-1 font-body',
                                isCompleted && 'line-through opacity-70'
                              )}
                            >
                              {event.title}
                            </span>
                            {isCompleted && (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary opacity-70" />
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
