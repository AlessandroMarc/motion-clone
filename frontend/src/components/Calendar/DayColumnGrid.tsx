'use client';

import { HOUR_PX } from './dayColumnLayout';
import { logger } from '@/lib/logger';

type TaskDrop = (
  task: { id: string; title: string; description?: string },
  date: Date,
  hour: number,
  minute: number
) => void;

type TaskDragOver = (
  date: Date,
  hour: number,
  minute: number,
  taskData?: { id: string; title: string; description?: string }
) => void;

interface DayColumnGridProps {
  date: Date;
  hours: number[];
  onGridCellClick: (date: Date, hour: number, minute: number) => void;
  onExternalTaskDrop?: TaskDrop;
  onExternalTaskDragOver?: TaskDragOver;
  scrollSentinelRef?: React.Ref<HTMLDivElement>;
  sentinelHour?: number;
}

function readTaskFromDataTransfer(dt: DataTransfer): {
  id: string;
  title: string;
  description?: string;
} | null {
  const taskId = dt.getData('application/x-task-id');
  if (!taskId) return null;
  const title = dt.getData('application/x-task-title') || 'Task';
  const description = dt.getData('application/x-task-description') || undefined;
  return { id: taskId, title, description };
}

export function DayColumnGrid({
  date,
  hours,
  onGridCellClick,
  onExternalTaskDrop,
  onExternalTaskDragOver,
  scrollSentinelRef,
  sentinelHour = 13,
}: DayColumnGridProps) {
  const handleDrop = (e: React.DragEvent, hour: number, minute: number) => {
    if (!onExternalTaskDrop) return;
    e.preventDefault();
    e.stopPropagation();

    const task = readTaskFromDataTransfer(e.dataTransfer);
    if (!task) {
      logger.warn('[DayColumn] Drop without task id');
      return;
    }
    onExternalTaskDrop(task, date, hour, minute);
  };

  const handleDragOver = (e: React.DragEvent, hour: number, minute: number) => {
    if (!onExternalTaskDrop) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    onExternalTaskDragOver?.(date, hour, minute);
  };

  return (
    <>
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
          className="border-b border-border/20 relative"
          onDragOver={e => handleDragOver(e, hour, 0)}
          onDrop={e => {
            // fallback if drop lands on the hour container rather than a slot
            if (!onExternalTaskDrop) return;
            e.preventDefault();
            e.stopPropagation();

            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            const minute = relativeY < rect.height / 2 ? 0 : 30;
            handleDrop(e, hour, minute);
          }}
        >
          <div
            className="h-8 border-b border-border/10 cursor-pointer hover:bg-primary/5 transition-colors relative z-10"
            onClick={() => onGridCellClick(date, hour, 0)}
            onDragOver={e => handleDragOver(e, hour, 0)}
            onDrop={e => handleDrop(e, hour, 0)}
          />
          <div
            className="h-8 cursor-pointer hover:bg-primary/5 transition-colors relative z-10"
            onClick={() => onGridCellClick(date, hour, 30)}
            onDragOver={e => handleDragOver(e, hour, 30)}
            onDrop={e => handleDrop(e, hour, 30)}
          />
        </div>
      ))}
    </>
  );
}
