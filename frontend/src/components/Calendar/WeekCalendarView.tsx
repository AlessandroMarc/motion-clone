'use client';

import type { RefObject } from 'react';
import {
  isCalendarEventTask,
  type CalendarEventTask,
  type CalendarEventUnion,
  type Schedule,
  type Task,
} from '@/../../../shared/types';
import { CalendarHeader } from './CalendarHeader';
import WeekScrollableGrid from './WeekScrollableGrid';
import CalendarCreateDialog from './CalendarCreateDialog';
import CalendarEditDialog from './CalendarEditDialog';
import { AutoScheduleDialog } from './AutoScheduleDialog';

type Dialogs = {
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  startTime: Date;
  setStartTime: (d: Date) => void;
  endTime: Date;
  setEndTime: (d: Date) => void;
  handleCreate: () => Promise<void>;

  editOpen: boolean;
  setEditOpen: (open: boolean) => void;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editDescription: string;
  setEditDescription: (v: string) => void;
  editStartTime: Date;
  setEditStartTime: (d: Date) => void;
  editEndTime: Date;
  setEditEndTime: (d: Date) => void;
  editEvent: CalendarEventUnion | null;
  editCompleted: boolean;
  setEditCompleted: (v: boolean) => void;
  openCreateDialog: (start: Date, end: Date) => void;
  openEditDialog: (event: CalendarEventUnion) => void;
  handleSaveEdit: (
    setEvents: (updater: (curr: CalendarEventUnion[]) => CalendarEventUnion[]) => void
  ) => Promise<void>;
  handleDeleteEdit: (
    setEvents: (updater: (curr: CalendarEventUnion[]) => CalendarEventUnion[]) => void
  ) => Promise<void>;
};

interface WeekCalendarViewProps {
  isMobile: boolean;
  weekDates: Date[];
  displayDates: Date[];
  displayEventsByDay: Record<string, CalendarEventUnion[]>;
  events: CalendarEventUnion[];
  setEvents: (updater: (curr: CalendarEventUnion[]) => CalendarEventUnion[]) => void;
  draggingEventId: string | null;
  dragPreview: any;
  externalDragPreview: any;
  onEventMouseDown: any;
  setDayRef: (idx: number, el: HTMLDivElement | null) => void;
  gridRef: RefObject<HTMLDivElement | null>;
  scrollSentinelRef: RefObject<HTMLDivElement | null>;
  sentinelHour: number;
  onExternalTaskDrop: any;
  onExternalTaskDragOver: any;
  tasksMap: Map<string, Task>;

  currentDay?: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;

  dialogs: Dialogs;

  user: { id: string } | null;
  activeSchedule: Schedule | null;

  autoScheduleOpen: boolean;
  setAutoScheduleOpen: (open: boolean) => void;
  tasks: Task[];
  handleAutoScheduleClick: () => Promise<void>;
  handleAutoSchedule: (events: any[]) => Promise<void>;
}

export function WeekCalendarView({
  isMobile,
  weekDates,
  displayDates,
  displayEventsByDay,
  events,
  setEvents,
  draggingEventId,
  dragPreview,
  externalDragPreview,
  onEventMouseDown,
  setDayRef,
  gridRef,
  scrollSentinelRef,
  sentinelHour,
  onExternalTaskDrop,
  onExternalTaskDragOver,
  tasksMap,
  currentDay,
  onPreviousWeek,
  onNextWeek,
  onCurrentWeek,
  onPreviousDay,
  onNextDay,
  dialogs,
  user,
  activeSchedule,
  autoScheduleOpen,
  setAutoScheduleOpen,
  tasks,
  handleAutoScheduleClick,
  handleAutoSchedule,
}: WeekCalendarViewProps) {
  return (
    <div className="space-y-4">
      <CalendarHeader
        weekDates={weekDates}
        onPreviousWeek={onPreviousWeek}
        onNextWeek={onNextWeek}
        onCurrentWeek={onCurrentWeek}
        onAutoSchedule={handleAutoScheduleClick}
        currentDay={isMobile ? currentDay : undefined}
        onPreviousDay={isMobile ? onPreviousDay : undefined}
        onNextDay={isMobile ? onNextDay : undefined}
      />

      <WeekScrollableGrid
        weekDates={displayDates}
        eventsByDay={displayEventsByDay}
        onGridCellClick={dialogs.openCreateDialog}
        onEventMouseDown={onEventMouseDown}
        draggingEventId={draggingEventId}
        dragPreview={draggingEventId ? dragPreview : externalDragPreview}
        setDayRef={setDayRef}
        gridRef={gridRef}
        scrollSentinelRef={scrollSentinelRef}
        sentinelHour={sentinelHour}
        onExternalTaskDrop={onExternalTaskDrop}
        onExternalTaskDragOver={onExternalTaskDragOver}
        tasksMap={tasksMap}
        isMobile={isMobile}
      />

      <CalendarCreateDialog
        open={dialogs.createOpen}
        onOpenChange={dialogs.setCreateOpen}
        title={dialogs.title}
        setTitle={dialogs.setTitle}
        description={dialogs.description}
        setDescription={dialogs.setDescription}
        startTime={dialogs.startTime}
        setStartTime={dialogs.setStartTime}
        endTime={dialogs.endTime}
        setEndTime={dialogs.setEndTime}
        onCreate={dialogs.handleCreate}
      />

      <CalendarEditDialog
        open={dialogs.editOpen}
        onOpenChange={dialogs.setEditOpen}
        title={dialogs.editTitle}
        setTitle={dialogs.setEditTitle}
        description={dialogs.editDescription}
        setDescription={dialogs.setEditDescription}
        startTime={dialogs.editStartTime}
        setStartTime={dialogs.setEditStartTime}
        endTime={dialogs.editEndTime}
        setEndTime={dialogs.setEditEndTime}
        isTaskEvent={dialogs.editEvent ? isCalendarEventTask(dialogs.editEvent) : false}
        completed={dialogs.editCompleted}
        completedAt={
          dialogs.editEvent &&
          isCalendarEventTask(dialogs.editEvent) &&
          dialogs.editEvent.completed_at
            ? new Date(dialogs.editEvent.completed_at)
            : null
        }
        onCompletedChange={dialogs.setEditCompleted}
        onSave={() => dialogs.handleSaveEdit(setEvents)}
        onDelete={() => dialogs.handleDeleteEdit(setEvents)}
      />

      {user && (
        <AutoScheduleDialog
          open={autoScheduleOpen}
          onOpenChange={setAutoScheduleOpen}
          tasks={tasks}
          existingEvents={events.filter(isCalendarEventTask) as CalendarEventTask[]}
          allCalendarEvents={events}
          userId={user.id}
          activeSchedule={activeSchedule}
          onSchedule={handleAutoSchedule}
        />
      )}
    </div>
  );
}


