import type { CalendarEventUnion } from '@/../../../shared/types';

export const HOUR_PX = 64; // 64px per hour to match time gutter (h-16)
export const GAP_PX = 4; // horizontal gap between side-by-side items

type LayoutInfo = { column: number; columns: number };
type LayoutMap = Record<string, LayoutInfo>;
type EventInterval = { id: string; startMin: number; endMin: number };
type ActiveEvent = { id: string; endMin: number; column: number };

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function durationMinutes(start: Date, end: Date): number {
  return Math.max(30, (end.getTime() - start.getTime()) / 60000);
}

function toIntervals(events: CalendarEventUnion[]): EventInterval[] {
  return events.map(ev => {
    const startDate = new Date(ev.start_time);
    const endDate = new Date(ev.end_time);
    return {
      id: ev.id,
      startMin: minutesFromMidnight(startDate),
      endMin: minutesFromMidnight(endDate),
    };
  });
}

/**
 * Compute side-by-side layout info for overlapping events in a single day column.
 * Output: { [eventId]: { column, columns } }.
 */
export function computeOverlapLayout(
  events: CalendarEventUnion[]
): LayoutMap {
  const intervals = toIntervals(events).sort(
    (a, b) => a.startMin - b.startMin || a.endMin - b.endMin
  );

  const layoutMap: LayoutMap = {};
  let active: ActiveEvent[] = [];

  for (const interval of intervals) {
    active = active.filter(a => a.endMin > interval.startMin);

    const usedColumns = new Set(active.map(a => a.column));
    let nextColumn = 0;
    while (usedColumns.has(nextColumn)) nextColumn++;

    active.push({
      id: interval.id,
      endMin: interval.endMin,
      column: nextColumn,
    });

    const columnsNow = Math.max(1, Math.max(...active.map(a => a.column)) + 1);
    for (const a of active) {
      layoutMap[a.id] = { column: a.column, columns: columnsNow };
    }
  }

  return layoutMap;
}

export function getEventBoxStyle(
  start: Date,
  end: Date,
  layout?: LayoutInfo
): React.CSSProperties {
  const minutes = minutesFromMidnight(start);
  const durMinutes = durationMinutes(start, end);

  const topPx = (minutes / 60) * HOUR_PX;
  const heightPx = (durMinutes / 60) * HOUR_PX;

  const columnIndex = layout?.column ?? 0;
  const totalColumns = layout?.columns ?? 1;
  const leftPct = (columnIndex / totalColumns) * 100;
  const widthPct = 100 / totalColumns;

  return {
    top: `${topPx}px`,
    height: `${heightPx}px`,
    left: `calc(${leftPct}% + ${GAP_PX / 2}px)`,
    width: `calc(${widthPct}% - ${GAP_PX}px)`,
  };
}


