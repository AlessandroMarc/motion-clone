import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { taskService } from '@/services/taskService';
import { calendarService } from '@/services/calendarService';
import type { Task, CalendarEventTask } from '@/types';
import { taskSchema, type TaskFormData } from '@/hooks/useTaskForm';
import {
  normalizeToMidnight,
  parseLocalDate,
  toLocalDateString,
} from '@/utils/dateUtils';
import { TaskFormContent } from './TaskFormContent';
import { TaskActionButtons } from './TaskActionButtons';
import { captureEvent, captureException } from '@/lib/analytics';
import { isTaskCompleted } from '@/utils/taskUtils';
import { fireConfetti } from '@/utils/confetti';

interface TaskEditDialogFormProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: (updatedTask: Task) => void;
  onTaskCloned?: (clonedTask: Task) => void;
}

const emptyFormValues: TaskFormData = {
  title: '',
  description: '',
  dueDate: '',
  priority: 'medium',
  project_id: null,
  planned_duration_minutes: 60,
  actual_duration_minutes: 0,
  blockedBy: [],
  scheduleId: '',
  is_recurring: false,
  recurrence_pattern: undefined,
  recurrence_interval: 1,
  recurrenceStartDate: undefined,
  startDate: undefined,
};

const mapTaskToFormValues = (task: Task): TaskFormData => ({
  title: task.title,
  description: task.description ?? '',
  dueDate: task.due_date ? toLocalDateString(new Date(task.due_date)) : '',
  priority: task.priority,
  project_id: task.project_id ?? null,
  planned_duration_minutes: task.planned_duration_minutes ?? 60,
  actual_duration_minutes: task.actual_duration_minutes ?? 0,
  blockedBy: task.blockedBy || [],
  scheduleId: task.schedule_id || '',
  is_recurring: task.is_recurring ?? false,
  recurrence_pattern: task.recurrence_pattern ?? undefined, // Normalize null to undefined
  recurrence_interval: task.recurrence_interval ?? 1,
  recurrenceStartDate: task.recurrence_start_date
    ? toLocalDateString(new Date(task.recurrence_start_date))
    : undefined,
  startDate: task.start_date
    ? toLocalDateString(new Date(task.start_date))
    : undefined,
});

export function TaskEditDialogForm({
  task,
  open,
  onOpenChange,
  onTaskUpdated,
  onTaskCloned,
}: TaskEditDialogFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkedEvents, setLinkedEvents] = useState<CalendarEventTask[]>([]);
  const [areEventsLoading, setAreEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const values = useMemo(
    () => (task ? mapTaskToFormValues(task) : emptyFormValues),
    [task]
  );

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: emptyFormValues,
    values,
  });

  const {
    handleSubmit,
    formState: { errors },
    reset,
  } = form;

  useEffect(() => {
    if (!task || !open) {
      setLinkedEvents([]);
      setEventsError(null);
      setAreEventsLoading(false);
      return;
    }

    let isCancelled = false;
    const fetchLinkedEvents = async () => {
      setAreEventsLoading(true);
      setEventsError(null);

      try {
        const events = await calendarService.getCalendarEventsByTaskId(task.id);
        if (!isCancelled) {
          setLinkedEvents(events);
        }
      } catch (error) {
        console.error('Failed to fetch linked calendar events:', error);
        if (!isCancelled) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load linked calendar events.';
          setEventsError(message);
        }
      } finally {
        if (!isCancelled) {
          setAreEventsLoading(false);
        }
      }
    };

    fetchLinkedEvents();

    return () => {
      isCancelled = true;
    };
  }, [task, open]);

  const handleDialogOpenChange = (isOpen: boolean) => {
    console.log(
      `📂 [TaskEditDialogForm] Dialog ${isOpen ? 'opened' : 'closed'}`,
      task?.id
    );
    if (!isOpen && task) {
      reset(mapTaskToFormValues(task));
    }
    onOpenChange(isOpen);
  };

  const handleCancel = () => {
    if (task) {
      reset(mapTaskToFormValues(task));
    } else {
      reset(emptyFormValues);
    }
    onOpenChange(false);
  };

  const onSubmit = async (data: TaskFormData) => {
    if (!task) {
      console.log('❌ [TaskEditDialogForm] No task found, skipping submission');
      return;
    }

    console.log('📝 [TaskEditDialogForm] Form submitted with data:', data);
    setIsSubmitting(true);
    try {
      console.log(
        '🚀 [TaskEditDialogForm] Calling taskService.updateTask for task:',
        task.id
      );
      const updatedTask = await taskService.updateTask(task.id, {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate
          ? normalizeToMidnight(parseLocalDate(data.dueDate))
          : null,
        priority: data.priority,
        project_id: data.project_id ?? null,
        plannedDurationMinutes: data.planned_duration_minutes,
        actualDurationMinutes: data.actual_duration_minutes ?? 0,
        blockedBy: data.blockedBy || [],
        scheduleId: data.scheduleId,
        isRecurring: data.is_recurring,
        recurrencePattern: data.is_recurring ? data.recurrence_pattern : null,
        recurrenceInterval: data.is_recurring ? data.recurrence_interval : null,
        recurrenceStartDate:
          data.is_recurring && data.recurrenceStartDate
            ? normalizeToMidnight(parseLocalDate(data.recurrenceStartDate))
            : null,
        startDate: data.startDate
          ? normalizeToMidnight(parseLocalDate(data.startDate))
          : null,
      });

      console.log(
        '✅ [TaskEditDialogForm] Task updated successfully:',
        JSON.parse(JSON.stringify(updatedTask))
      );
      onTaskUpdated(updatedTask);
      toast.success('Task updated successfully');

      // PostHog: Capture task updated event
      captureEvent('task_updated', {
        priority: data.priority,
        has_due_date: !!data.dueDate,
        has_project: !!data.project_id,
        planned_duration_minutes: data.planned_duration_minutes,
        has_dependencies: (data.blockedBy?.length || 0) > 0,
        linked_events_count: linkedEvents.length,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('❌ [TaskEditDialogForm] Failed to update task:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
      });
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update task. Please try again.';
      toast.error(message);

      // PostHog: Capture task update error
      captureException(error instanceof Error ? error : new Error(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getValidationErrorMessage = () => {
    const errorMessages = Object.entries(form.formState.errors)
      .map(([field, error]) => {
        const fieldName = field.replace(/_/g, ' ');
        const message =
          error && typeof error === 'object' && 'message' in error
            ? String(error.message)
            : '';
        return message || `${fieldName} is invalid`;
      })
      .join(', ');

    return errorMessages || 'Please fix form errors before continuing.';
  };

  const handleCloneTask = async () => {
    if (!task) {
      return;
    }

    const isValidNow = await form.trigger();
    if (!isValidNow) {
      toast.error(`Validation failed: ${getValidationErrorMessage()}`);
      return;
    }

    const data = form.getValues();

    setIsSubmitting(true);
    try {
      const clonedTask = await taskService.createTask({
        title: data.title,
        description: data.description,
        dueDate: data.dueDate
          ? normalizeToMidnight(parseLocalDate(data.dueDate))
          : null,
        priority: data.priority,
        project_id: data.project_id ?? undefined,
        scheduleId: data.scheduleId || undefined,
        blockedBy: data.blockedBy || [],
        plannedDurationMinutes: data.planned_duration_minutes,
        actualDurationMinutes: data.actual_duration_minutes ?? 0,
        isRecurring: data.is_recurring,
        recurrencePattern: data.is_recurring
          ? data.recurrence_pattern
          : undefined,
        recurrenceInterval: data.is_recurring
          ? data.recurrence_interval
          : undefined,
        recurrenceStartDate:
          data.is_recurring && data.recurrenceStartDate
            ? normalizeToMidnight(parseLocalDate(data.recurrenceStartDate))
            : null,
        startDate: data.startDate
          ? normalizeToMidnight(parseLocalDate(data.startDate))
          : null,
      });

      onTaskCloned?.(clonedTask);
      toast.success('Task cloned successfully');
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to clone task. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const taskCompleted = task ? isTaskCompleted(task) : false;

  const handleToggleCompletion = async () => {
    if (!task) return;

    setIsSubmitting(true);
    try {
      if (!taskCompleted) {
        fireConfetti();
        const updatedTask = await taskService.completeTaskWithEvents(task);
        onTaskUpdated(updatedTask);
        toast.success('Task completed');
        captureEvent('task_completed', {
          task_id: task.id,
          priority: task.priority,
          has_project: !!task.project_id,
          planned_duration_minutes: task.planned_duration_minutes,
        });
      } else {
        const updatedTask = await taskService.setTaskCompleted(task, false);
        onTaskUpdated(updatedTask);
        toast.success('Task reopened');
        captureEvent('task_reopened', {
          task_id: task.id,
          priority: task.priority,
        });
      }
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update task completion.';
      toast.error(message);
      captureException(error instanceof Error ? error : new Error(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open && !!task} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] p-4 sm:w-full sm:max-w-[500px] sm:p-6 max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="pr-8">Edit Task</DialogTitle>
          {task && (
            <DialogDescription>
              Update the fields below to change the details of{' '}
              <span className="font-medium break-words">{task.title}</span>.
            </DialogDescription>
          )}
        </DialogHeader>

        <FormProvider {...form}>
          <form
            className="space-y-6 overflow-y-auto flex-1 min-w-0 pr-0 sm:pr-1"
            onSubmit={e => {
              console.log(
                '📋 [TaskEditDialogForm] Form submit event triggered'
              );
              if (Object.keys(errors).length > 0) {
                console.error('❌ Form validation errors:', errors);
                toast.error(
                  `Validation failed: ${getValidationErrorMessage()}`
                );
              }
              handleSubmit(onSubmit)(e);
            }}
          >
            <TaskFormContent
              currentTaskId={task?.id}
              errors={errors}
              linkedEvents={linkedEvents}
              areEventsLoading={areEventsLoading}
              eventsError={eventsError}
              actions={
                <TaskActionButtons
                  taskCompleted={taskCompleted}
                  isSubmitting={isSubmitting}
                  onComplete={handleToggleCompletion}
                  onClone={handleCloneTask}
                  onCancel={handleCancel}
                />
              }
            />
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
