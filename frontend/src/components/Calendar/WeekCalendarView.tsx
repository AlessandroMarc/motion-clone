'use client';

import type { RefObject } from 'react';
import {
  isCalendarEventTask,
  type CalendarEventUnion,
  type Task,
} from '@/types';
import type { FilteredGoogleEvent } from '@/services/googleCalendarService';
import type { TaskCreateFormProps } from '@/hooks/useTaskForm';
import { CalendarHeader, CalendarLegend } from './CalendarHeader';
import WeekScrollableGrid from './WeekScrollableGrid';
import CalendarEditDialog from './CalendarEditDialog';
import { CalendarCompletionDialog } from './CalendarCompletionDialog';
import { CalendarCreateChoiceDialog } from './CalendarCreateChoiceDialog';
import { GoogleCalendarEventForm } from './GoogleCalendarEventForm';
import { TaskCreateDialogForm } from '@/components/Tasks/forms/TaskCreateDialogForm';
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
  handleUpdateCompletion: (
    completed: boolean,
    setEvents: React.Dispatch<React.SetStateAction<CalendarEventUnion[]>>
  ) => Promise<void>;
  completionChoiceOpen: boolean;
  setCompletionChoiceOpen: React.Dispatch<React.SetStateAction<boolean>>;
  completionChoiceSessionCount: number;
  completionChoiceIsRecurring: boolean;
  handleCompletionChoice: (
    choice: 'session' | 'task',
    setEvents: React.Dispatch<React.SetStateAction<CalendarEventUnion[]>>
  ) => Promise<void>;
  // Choice dialog (Task vs Google Event)
  choiceDialogOpen: boolean;
  setChoiceDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleGridCellClick: (date: Date, hour: number, minute: number) => void;
  getSlotLabel: () => string | undefined;
  handleChooseTask: () => void;
  handleChooseGoogleEvent: () => void;
  // Task create from calendar
  taskCreateFromCalendarOpen: boolean;
  setTaskCreateFromCalendarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  // Google Calendar event form
  googleEventFormOpen: boolean;
  setGoogleEventFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
  googleEventFormMode: 'create' | 'edit';
  googleEventFormData: {
    title?: string;
    description?: string;
    startTime: string;
    endTime: string;
    googleEventId?: string;
  } | null;
  handleGoogleEventSaved: () => Promise<void>;
  handleEditGoogleEvent: () => void;
  handleDeleteGoogleEvent: (
    setEvents: React.Dispatch<React.SetStateAction<CalendarEventUnion[]>>
  ) => Promise<void>;
};

interface WeekCalendarViewProps {
  isMobile: boolean;
  weekDates: Date[];
  displayDates: Date[];
  displayEventsByDay: Record<string, CalendarEventUnion[]>;
  events: CalendarEventUnion[];
  allDayEvents?: FilteredGoogleEvent[];
  reminderTasks?: Task[];
  onBannerEventClick?: (event: FilteredGoogleEvent) => void;
  // Optional full event set (across all weeks) for components that need global visibility
  violationEvents?: CalendarEventUnion[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEventUnion[]>>;
  draggingEventId: string | null;
  dragPreview: CalendarEventUnion | null;
  externalDragPreview: CalendarEventUnion | null;
  onEventMouseDown: (
    e: React.MouseEvent,
    event: CalendarEventUnion,
    eventDayIndex: number
  ) => void;
  onResizeMouseDown: (
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
  openTaskEditForm: () => void;
  onReminderTaskClick?: (task: Task) => void;

  handleAutoScheduleClick: () => Promise<void>;
  isAutoScheduleRefreshing?: boolean;
  onTaskCreate?: TaskCreateFormProps['onTaskCreate'];

  workingHoursStart?: number;
  workingHoursEnd?: number;
  googleCalendarConnected?: boolean;
}

export function WeekCalendarView({
  isMobile,
  weekDates,
  displayDates,
  displayEventsByDay,
  events,
  allDayEvents = [],
  reminderTasks = [],
  onBannerEventClick,
  setEvents,
  draggingEventId,
  dragPreview,
  externalDragPreview,
  onEventMouseDown,
  onResizeMouseDown,
  setDayRef,
  gridRef,
  scrollSentinelRef,
  sentinelHour,
  onExternalTaskDrop,
  onExternalTaskDragOver,
  tasksMap,
  violationEvents,
  currentDay,
  onPreviousWeek,
  onNextWeek,
  onCurrentWeek,
  onPreviousDay,
  onNextDay,
  onZenMode,
  dialogs,
  openTaskEditForm,
  onReminderTaskClick,
  handleAutoScheduleClick,
  isAutoScheduleRefreshing,
  onTaskCreate,
  workingHoursStart,
  workingHoursEnd,
  googleCalendarConnected = false,
}: WeekCalendarViewProps) {
  const editEvent = dialogs.editEvent as
    | (CalendarEventUnion & {
        synced_from_google?: boolean;
        google_event_id?: string | null;
      })
    | null;
  const isSyncedFromGoogle = editEvent?.synced_from_google === true;
  const isTaskEvent = editEvent ? isCalendarEventTask(editEvent) : false;

  return (
    <div className="space-y-4">
      <DeadlineViolationsBar
        events={violationEvents ?? events}
        tasksMap={tasksMap}
      />

      <CalendarHeader
        weekDates={weekDates}
        onPreviousWeek={onPreviousWeek}
        onNextWeek={onNextWeek}
        onCurrentWeek={onCurrentWeek}
        onAutoSchedule={handleAutoScheduleClick}
        isAutoScheduleRefreshing={isAutoScheduleRefreshing}
        onZenMode={onZenMode}
        onTaskCreate={onTaskCreate}
        currentDay={isMobile ? currentDay : undefined}
        onPreviousDay={isMobile ? onPreviousDay : undefined}
        onNextDay={isMobile ? onNextDay : undefined}
      />

      <CalendarLegend />

      <WeekScrollableGrid
        weekDates={displayDates}
        eventsByDay={displayEventsByDay}
        allDayEvents={allDayEvents}
        reminderTasks={reminderTasks}
        onBannerEventClick={onBannerEventClick}
        onReminderTaskClick={onReminderTaskClick}
        onGridCellClick={dialogs.handleGridCellClick}
        onEventMouseDown={onEventMouseDown}
        onResizeMouseDown={onResizeMouseDown}
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
        workingHoursStart={workingHoursStart}
        workingHoursEnd={workingHoursEnd}
      />

      {/* Choice dialog: Task vs Google Calendar Event */}
      <CalendarCreateChoiceDialog
        open={dialogs.choiceDialogOpen}
        onOpenChange={dialogs.setChoiceDialogOpen}
        onChooseTask={dialogs.handleChooseTask}
        onChooseGoogleEvent={dialogs.handleChooseGoogleEvent}
        googleCalendarConnected={googleCalendarConnected}
        slotLabel={typeof dialogs.getSlotLabel === 'function' ? dialogs.getSlotLabel() : undefined}
      />

      {/* Task create dialog triggered from calendar click */}
      {onTaskCreate && (
        <TaskCreateDialogForm
          onTaskCreate={onTaskCreate}
          open={dialogs.taskCreateFromCalendarOpen}
          onOpenChange={dialogs.setTaskCreateFromCalendarOpen}
        />
      )}

      {/* Google Calendar event create/edit form */}
      <GoogleCalendarEventForm
        open={dialogs.googleEventFormOpen}
        onOpenChange={dialogs.setGoogleEventFormOpen}
        mode={dialogs.googleEventFormMode}
        initialData={dialogs.googleEventFormData ?? undefined}
        onSaved={dialogs.handleGoogleEventSaved}
      />

      <CalendarEditDialog
        open={dialogs.editOpen}
        onOpenChange={dialogs.setEditOpen}
        title={dialogs.editTitle}
        description={dialogs.editDescription}
        startTime={dialogs.editStartTime}
        endTime={dialogs.editEndTime}
        isTaskEvent={isTaskEvent}
        isSyncedFromGoogle={isSyncedFromGoogle}
        completed={dialogs.editCompleted}
        onCompletedChange={completed =>
          dialogs.handleUpdateCompletion(completed, setEvents)
        }
        onLinkClick={openTaskEditForm}
        onDelete={() => dialogs.handleDeleteEdit(setEvents)}
        onEditGoogleEvent={dialogs.handleEditGoogleEvent}
        onDeleteGoogleEvent={() =>
          dialogs.handleDeleteGoogleEvent(setEvents)
        }
      />
      <CalendarCompletionDialog
        open={dialogs.completionChoiceOpen}
        sessionCount={dialogs.completionChoiceSessionCount}
        isRecurring={dialogs.completionChoiceIsRecurring}
        onChoice={choice => dialogs.handleCompletionChoice(choice, setEvents)}
        onCancel={() => dialogs.setCompletionChoiceOpen(false)}
      />
    </div>
  );
}
