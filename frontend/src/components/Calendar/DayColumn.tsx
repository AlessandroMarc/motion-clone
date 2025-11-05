'use client';

import { CalendarEvent } from '@/../../../shared/types';
import { CalendarEventCard } from './CalendarEventCard';
import { isSameDay } from '@/utils/calendarUtils';

interface DayColumnProps {
  date: Date;
  dayIndex: number;
  dayEvents: CalendarEvent[];
  onGridCellClick: (date: Date, hour: number, minute: number) => void;
  onEventMouseDown: (
    e: React.MouseEvent,
    event: CalendarEvent,
    eventDayIndex: number
  ) => void;
  draggingEventId: string | null;
  dragPreview: CalendarEvent | null;
  setDayRef: (el: HTMLDivElement | null) => void;
  scrollSentinelRef?: React.Ref<HTMLDivElement>;
  sentinelHour?: number;
  onExternalTaskDrop?: (
    task: { id: string; title: string; description?: string },
    date: Date,
    hour: number,
    minute: number
  ) => void;
  onExternalTaskDragOver?: (
    date: Date,
    hour: number,
    minute: number,
    taskData?: { id: string; title: string; description?: string }
  ) => void;
}

const HOUR_PX = 64; // 64px per hour to match time gutter (h-16)
const GAP_PX = 4; // horizontal gap between side-by-side items

export function DayColumn({
  date,
  dayIndex,
  dayEvents,
  onGridCellClick,
  onEventMouseDown,
  draggingEventId,
  dragPreview,
  setDayRef,
  scrollSentinelRef,
  sentinelHour = 13,
  onExternalTaskDrop,
  onExternalTaskDragOver,
}: DayColumnProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  type LayoutInfo = { column: number; columns: number };
  type LayoutMap = Record<string, LayoutInfo>;
  type EventInterval = { id: string; startMin: number; endMin: number };
  type ActiveEvent = { id: string; endMin: number; column: number };

  const getMinutesFromMidnight = (date: Date) =>
    date.getHours() * 60 + date.getMinutes();
  const getDurationMinutes = (start: Date, end: Date) =>
    Math.max(30, (end.getTime() - start.getTime()) / 60000);

  const toIntervals = (events: CalendarEvent[]): EventInterval[] =>
    events.map(ev => {
      const startDate = new Date(ev.start_time);
      const endDate = new Date(ev.end_time);
      return {
        id: ev.id,
        startMin: getMinutesFromMidnight(startDate),
        endMin: getMinutesFromMidnight(endDate),
      };
    });

  const computeOverlapLayout = (events: CalendarEvent[]): LayoutMap => {
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

      const columnsNow = Math.max(
        1,
        Math.max(...active.map(a => a.column)) + 1
      );
      for (const a of active)
        layoutMap[a.id] = { column: a.column, columns: columnsNow };
    }

    return layoutMap;
  };

  const renderEventBox = (
    event: CalendarEvent,
    isGhost: boolean,
    layout: LayoutInfo | undefined
  ) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const minutesFromMidnight = getMinutesFromMidnight(start);
    const durationMinutes = getDurationMinutes(start, end);

    const topPx = (minutesFromMidnight / 60) * HOUR_PX;
    const heightPx = (durationMinutes / 60) * HOUR_PX;

    const columnIndex = layout?.column ?? 0;
    const totalColumns = layout?.columns ?? 1;
    const leftPct = (columnIndex / totalColumns) * 100;
    const widthPct = 100 / totalColumns;

    return (
      <div
        key={event.id + (isGhost ? '-ghost' : '')}
        className={`absolute z-10 ${
          draggingEventId === event.id
            ? isGhost
              ? 'opacity-80 cursor-grabbing'
              : 'hidden'
            : ''
        }`}
        style={{
          top: `${topPx}px`,
          height: `${heightPx}px`,
          left: `calc(${leftPct}% + ${GAP_PX / 2}px)`,
          width: `calc(${widthPct}% - ${GAP_PX}px)`,
        }}
        onMouseDown={e => onEventMouseDown(e, event, dayIndex)}
      >
        <CalendarEventCard event={event} />
      </div>
    );
  };

  const previewBelongsHere =
    dragPreview && isSameDay(dragPreview.start_time as Date, date);

  // Build layout map including drag preview if it belongs here
  const eventsForLayout: CalendarEvent[] =
    previewBelongsHere && dragPreview
      ? [...dayEvents, dragPreview as CalendarEvent]
      : dayEvents;
  const layoutMap = computeOverlapLayout(eventsForLayout);

  return (
    <div
      className="bg-background relative"
      ref={setDayRef}
      onDragOver={e => {
        console.log('[DayColumn] onDragOver on main container');
        if (onExternalTaskDrop) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {/* Invisible scroll sentinel positioned at target hour (if provided) */}
      {scrollSentinelRef ? (
        <div
          ref={scrollSentinelRef}
          className="absolute w-px h-px opacity-0 pointer-events-none"
          style={{ top: `${(sentinelHour / 1) * HOUR_PX}px`, left: 0 }}
        />
      ) : null}

      {hours.map(hour => (
        <div
          key={hour}
          className="border-b border-border relative"
          onDragOver={e => {
            if (!onExternalTaskDrop) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';

            onExternalTaskDragOver?.(date, hour, 0);
          }}
          onDrop={e => {
            if (!onExternalTaskDrop) return;

            e.preventDefault();
            e.stopPropagation();

            const rect = (
              e.currentTarget as HTMLDivElement
            ).getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            const minute = relativeY < rect.height / 2 ? 0 : 30;

            const taskId = e.dataTransfer.getData('application/x-task-id');
            const title =
              e.dataTransfer.getData('application/x-task-title') || 'Task';
            const description =
              e.dataTransfer.getData('application/x-task-description') ||
              undefined;

            console.log('[DayColumn] onDrop fallback (hour container)', {
              hour,
              minute,
              taskId,
              title,
              rect,
              relativeY,
            });

            if (!taskId) {
              console.error(
                '[DayColumn] No task ID found in dataTransfer during hour-container drop'
              );
              return;
            }

            try {
              onExternalTaskDrop(
                { id: taskId, title, description },
                date,
                hour,
                minute
              );
              console.log(
                '[DayColumn] onExternalTaskDrop called from hour container'
              );
            } catch (error) {
              console.error(
                '[DayColumn] Failed to call onExternalTaskDrop from hour container:',
                error
              );
            }
          }}
        >
          {/* top half-hour */}
          <div
            className="h-8 border-b border-border/50 cursor-pointer hover:bg-muted/40 relative z-10"
            onClick={() => onGridCellClick(date, hour, 0)}
            onDragOver={e => {
              if (onExternalTaskDrop) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                onExternalTaskDragOver?.(date, hour, 0);
              }
            }}
            onDrop={e => {
              console.log('[DayColumn] onDrop EVENT FIRED (top half-hour)', {
                hour,
                hasOnExternalTaskDrop: !!onExternalTaskDrop,
                dataTransferTypes: Array.from(e.dataTransfer.types),
                timestamp: new Date().toISOString(),
              });
              e.preventDefault();
              e.stopPropagation();

              if (!onExternalTaskDrop) {
                console.error(
                  '[DayColumn] ERROR: onExternalTaskDrop handler not provided'
                );
                return;
              }

              const taskId = e.dataTransfer.getData('application/x-task-id');
              const title =
                e.dataTransfer.getData('application/x-task-title') || 'Task';
              const description =
                e.dataTransfer.getData('application/x-task-description') ||
                undefined;

              console.log('[DayColumn] Extracted task data from drop:', {
                taskId,
                title,
                description,
                hasTaskId: !!taskId,
              });

              if (!taskId) {
                console.error(
                  '[DayColumn] ERROR: No task ID found in dataTransfer'
                );
                console.log(
                  '[DayColumn] Available dataTransfer types:',
                  Array.from(e.dataTransfer.types)
                );
                console.log('[DayColumn] All dataTransfer items:', {
                  taskId: e.dataTransfer.getData('application/x-task-id'),
                  text: e.dataTransfer.getData('text/plain'),
                  html: e.dataTransfer.getData('text/html'),
                });
                return;
              }

              console.log(
                '[DayColumn] About to call onExternalTaskDrop with:',
                {
                  task: { id: taskId, title, description },
                  date: date.toISOString(),
                  hour,
                  minute: 0,
                }
              );

              try {
                onExternalTaskDrop(
                  { id: taskId, title, description },
                  date,
                  hour,
                  0
                );
                console.log(
                  '[DayColumn] onExternalTaskDrop called successfully'
                );
              } catch (error) {
                console.error(
                  '[DayColumn] ERROR calling onExternalTaskDrop:',
                  error
                );
              }
            }}
          />
          {/* bottom half-hour */}
          <div
            className="h-8 cursor-pointer hover:bg-muted/40 relative z-10"
            onClick={() => onGridCellClick(date, hour, 30)}
            onDragOver={e => {
              if (onExternalTaskDrop) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                onExternalTaskDragOver?.(date, hour, 30);
              }
            }}
            onDrop={e => {
              console.log('[DayColumn] onDrop EVENT FIRED (bottom half-hour)', {
                hour,
                minute: 30,
                hasOnExternalTaskDrop: !!onExternalTaskDrop,
                dataTransferTypes: Array.from(e.dataTransfer.types),
                timestamp: new Date().toISOString(),
              });
              e.preventDefault();
              e.stopPropagation();

              if (!onExternalTaskDrop) {
                console.error(
                  '[DayColumn] ERROR: onExternalTaskDrop handler not provided'
                );
                return;
              }

              const taskId = e.dataTransfer.getData('application/x-task-id');
              const title =
                e.dataTransfer.getData('application/x-task-title') || 'Task';
              const description =
                e.dataTransfer.getData('application/x-task-description') ||
                undefined;

              console.log('[DayColumn] Extracted task data from drop:', {
                taskId,
                title,
                description,
                hasTaskId: !!taskId,
              });

              if (!taskId) {
                console.error(
                  '[DayColumn] ERROR: No task ID found in dataTransfer'
                );
                console.log(
                  '[DayColumn] Available dataTransfer types:',
                  Array.from(e.dataTransfer.types)
                );
                console.log('[DayColumn] All dataTransfer items:', {
                  taskId: e.dataTransfer.getData('application/x-task-id'),
                  text: e.dataTransfer.getData('text/plain'),
                  html: e.dataTransfer.getData('text/html'),
                });
                return;
              }

              console.log(
                '[DayColumn] About to call onExternalTaskDrop with:',
                {
                  task: { id: taskId, title, description },
                  date: date.toISOString(),
                  hour,
                  minute: 30,
                }
              );

              try {
                onExternalTaskDrop(
                  { id: taskId, title, description },
                  date,
                  hour,
                  30
                );
                console.log(
                  '[DayColumn] onExternalTaskDrop called successfully'
                );
              } catch (error) {
                console.error(
                  '[DayColumn] ERROR calling onExternalTaskDrop:',
                  error
                );
              }
            }}
          />
        </div>
      ))}

      {/* Render existing events (hide the one being dragged; ghost will show separately) */}
      {dayEvents.map(event =>
        draggingEventId === event.id
          ? null
          : renderEventBox(event, false, layoutMap[event.id])
      )}

      {/* Render ghost/preview in the column where it currently is */}
      {previewBelongsHere && dragPreview
        ? renderEventBox(
            dragPreview as CalendarEvent,
            true,
            layoutMap[(dragPreview as CalendarEvent).id]
          )
        : null}
    </div>
  );
}

export default DayColumn;
