'use client';

import type { RefObject } from 'react';
import {
  isCalendarEventTask,
  type CalendarEventTask,
  type CalendarEventUnion,
  type Schedule,
  type Task,
} from '@/types';
import { CalendarHeader } from './CalendarHeader';
import WeekScrollableGrid from './WeekScrollableGrid';
import CalendarCreateDialog from './CalendarCreateDialog';
import CalendarEditDialog from './CalendarEditDialog';
import { AutoScheduleDialog } from './AutoScheduleDialog';
import { DeadlineViolationsBar } from './DeadlineViolationsBar';

type Dialogs = {
  createOpen: boolean;
  setCreateOpen: React.Dispatch<React.SetStateAction<boolean>>;
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  description: string;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  startTime: string;
  setStartTime: React.Dispatch<React.SetStateAction<string>>;
  endTime: string;
  setEndTime: React.Dispatch<React.SetStateAction<string>>;
  handleCreate: () => Promise<void>;

  editOpen: boolean;
  setEditOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editTitle: string;
  setEditTitle: React.Dispatch<React.SetStateAction<string>>;
  editDescription: string;
  setEditDescription: React.Dispatch<React.SetStateAction<string>>;
  editStartTime: string;
  setEditStartTime: React.Dispatch<React.SetStateAction<string>>;
  editEndTime: string;
  setEditEndTime: React.Dispatch<React.SetStateAction<string>>;
  editEvent: CalendarEventUnion | null;
  editCompleted: boolean;
  setEditCompleted: React.Dispatch<React.SetStateAction<boolean>>;
  openCreateDialog: (date: Date, hour: number, minute: number) => void;
  openEditDialog: (event: CalendarEventUnion) => void;
  handleSaveEdit: (
    setEvents: React.Dispatch<React.SetStateAction<CalendarEventUnion[]>>
  ) => Promise<void>;
  handleDeleteEdit: (
    setEvents: React.Dispatch<React.SetStateAction<CalendarEventUnion[]>>
  ) => Promise<void>;
};

interface WeekCalendarViewProps {
  isMobile: boolean;
  weekDates: Date[];
  displayDates: Date[];
  displayEventsByDay: Record<string, CalendarEventUnion[]>;
  events: CalendarEventUnion[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEventUnion[]>>;
  draggingEventId: string | null;
  dragPreview: CalendarEventUnion | null;
  externalDragPreview: CalendarEventUnion | null;
  onEventMouseDown: (
    e: React.MouseEvent,
    event: CalendarEventUnion,
    eventDayIndex: number
  ) => void;
  setDayRef: (idx: number, el: HTMLDivElement | null) => void;
  gridRef: RefObject<HTMLDivElement | null>;
  scrollSentinelRef: RefObject<HTMLDivElement | null>;
  sentinelHour: number;
  onExternalTaskDrop: (
    task: { id: string; title: string; description?: string },
    date: Date,
    hour: number,
    minute: number
  ) => void;
  onExternalTaskDragOver: (date: Date, hour: number, minute: number) => void;
  tasksMap: Map<string, Task>;

  currentDay?: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  onZenMode?: () => void;

  dialogs: Dialogs;

  user: { id: string } | null;
  activeSchedule: Schedule | null;

  autoScheduleOpen: boolean;
  setAutoScheduleOpen: (open: boolean) => void;
  tasks: Task[];
  handleAutoScheduleClick: () => Promise<void>;
  handleAutoSchedule: (
    eventsToCreate: Array<{
      title: string;
      start_time: string;
      end_time: string;
      description?: string;
      linked_task_id: string;
      user_id: string;
    }>
  ) => Promise<void>;
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
  onZenMode,
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
      <DeadlineViolationsBar events={events} tasksMap={tasksMap} />

      <CalendarHeader
        weekDates={weekDates}
        onPreviousWeek={onPreviousWeek}
        onNextWeek={onNextWeek}
        onCurrentWeek={onCurrentWeek}
        onAutoSchedule={handleAutoScheduleClick}
        onZenMode={onZenMode}
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
        isTaskEvent={
          dialogs.editEvent ? isCalendarEventTask(dialogs.editEvent) : false
        }
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
          existingEvents={
            events.filter(isCalendarEventTask) as CalendarEventTask[]
          }
          allCalendarEvents={events}
          userId={user.id}
          activeSchedule={activeSchedule}
          onSchedule={handleAutoSchedule}
        />
      )}
    </div>
  );
}
