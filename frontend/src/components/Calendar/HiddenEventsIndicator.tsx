'use client';

import { useState } from 'react';
import { EyeOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FilteredGoogleEvent } from '@/services/googleCalendarService';

interface HiddenEventsIndicatorProps {
  events: FilteredGoogleEvent[];
}

export function HiddenEventsIndicator({ events }: HiddenEventsIndicatorProps) {
  const [open, setOpen] = useState(false);

  if (events.length === 0) return null;

  return (
    <>
      {/* Badge */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 z-40 flex items-center gap-1.5',
          'rounded-full px-3 py-1.5 text-xs font-medium shadow-md',
          'bg-muted text-muted-foreground border border-border',
          'hover:bg-accent hover:text-accent-foreground transition-colors'
        )}
      >
        <EyeOff className="h-3 w-3" />
        {events.length} hidden
      </button>

      {/* Popover panel */}
      {open && (
        <div className="fixed bottom-12 left-4 z-50 w-72 rounded-xl border border-border bg-popover shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">
              Hidden Google events
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">
            These events are not shown on the calendar and don&apos;t block
            scheduling (free or declined).
          </p>
          <ul className="space-y-1.5 max-h-60 overflow-y-auto">
            {events.map((ev, i) => (
              <li
                key={i}
                className="text-xs rounded-md bg-muted/50 px-2 py-1.5"
              >
                <p className="font-medium text-foreground truncate">
                  {ev.title}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {new Date(ev.start_time).toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {' · '}
                  <span className="capitalize">{ev.reason}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
