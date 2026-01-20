'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export function CalendarSkeleton() {
  const isMobile = useIsMobile();
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = isMobile ? 1 : 7;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <CalendarHeaderSkeleton isMobile={isMobile} />

      {/* Calendar grid skeleton */}
      <div className="border rounded-lg overflow-hidden h-[calc(100vh-100px)] md:h-[calc(100vh-100px)]">
        {/* Grid header */}
        <div
          className={cn(
            'grid gap-px bg-border rounded-t-lg overflow-hidden',
            isMobile ? 'grid-cols-2' : 'grid-cols-8'
          )}
        >
          {/* Time column header */}
          <div className="bg-muted p-3">
            <Skeleton className="h-4 w-10" />
          </div>
          {/* Day headers */}
          {Array.from({ length: days }).map((_, index) => (
            <div key={index} className="bg-muted p-3">
              <div className="flex flex-col items-center gap-1">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-5 w-6" />
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable grid area */}
        <div className="h-full overflow-y-auto w-full">
          <div
            className={cn(
              'grid gap-px bg-border w-full',
              isMobile ? 'grid-cols-2' : 'grid-cols-8'
            )}
          >
            {/* Time column */}
            <div className="bg-background">
              {hours.map(hour => (
                <div
                  key={hour}
                  className="h-16 border-b border-border flex items-start justify-end pr-3 pt-1"
                >
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>

            {/* Day columns with random skeleton events */}
            {Array.from({ length: days }).map((_, dayIndex) => (
              <DayColumnSkeleton key={dayIndex} hours={hours} dayIndex={dayIndex} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarHeaderSkeleton({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-24" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-9" />
          <div className="text-center flex-1 px-4">
            <Skeleton className="h-4 w-20 mx-auto mb-1" />
            <Skeleton className="h-6 w-32 mx-auto" />
          </div>
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="flex items-center space-x-2">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-9 w-9" />
      </div>
    </div>
  );
}

function DayColumnSkeleton({
  hours,
  dayIndex,
}: {
  hours: number[];
  dayIndex: number;
}) {
  // Generate deterministic but varied skeleton events based on dayIndex
  const skeletonEvents = getSkeletonEventsForDay(dayIndex);

  return (
    <div className="bg-background relative">
      {/* Hour cells */}
      {hours.map(hour => (
        <div
          key={hour}
          className="h-16 border-b border-border"
        />
      ))}

      {/* Skeleton events */}
      {skeletonEvents.map((event, index) => (
        <div
          key={index}
          className="absolute left-1 right-1"
          style={{
            top: `${event.startHour * 64 + 4}px`,
            height: `${event.durationHours * 64 - 8}px`,
          }}
        >
          <Skeleton className="w-full h-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

function getSkeletonEventsForDay(dayIndex: number) {
  // Create varied but deterministic skeleton events for each day
  const patterns = [
    [
      { startHour: 9, durationHours: 1 },
      { startHour: 14, durationHours: 1.5 },
    ],
    [
      { startHour: 10, durationHours: 2 },
      { startHour: 15, durationHours: 1 },
    ],
    [{ startHour: 11, durationHours: 1 }],
    [
      { startHour: 9, durationHours: 1 },
      { startHour: 11, durationHours: 1 },
      { startHour: 16, durationHours: 1.5 },
    ],
    [{ startHour: 13, durationHours: 2 }],
    [
      { startHour: 10, durationHours: 1 },
      { startHour: 14, durationHours: 1 },
    ],
    [{ startHour: 15, durationHours: 1.5 }],
  ];

  return patterns[dayIndex % patterns.length];
}

export default CalendarSkeleton;
