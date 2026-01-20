import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { taskService } from '@/services/taskService';
import { calendarService } from '@/services/calendarService';
import type { Task, CalendarEventTask } from '@shared/types';
import { taskSchema, type TaskFormData } from '@/hooks/useTaskForm';
import { TaskTitleField } from './TaskTitleField';
import { TaskDescriptionField } from './TaskDescriptionField';
import { TaskDueDateField } from './TaskDueDateField';
import { TaskPriorityField } from './TaskPriorityField';
import { TaskProjectField } from './TaskProjectField';
import { TaskBlockedByField } from './TaskBlockedByField';
import { TaskDurationFields } from './TaskDurationFields';
import { TaskFormActions } from './TaskFormActions';
import { formatEventTime } from '@/utils/calendarUtils';
import posthog from 'posthog-js';

interface TaskEditDialogFormProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: (updatedTask: Task) => void;
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
};

const formatDateTimeLocal = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const mapTaskToFormValues = (task: Task): TaskFormData => ({
  title: task.title,
  description: task.description ?? '',
  dueDate: task.due_date ? formatDateTimeLocal(new Date(task.due_date)) : '',
  priority: task.priority,
  project_id: task.project_id ?? null,
  planned_duration_minutes: task.planned_duration_minutes ?? 60,
  actual_duration_minutes: task.actual_duration_minutes ?? 0,
  blockedBy: task.blockedBy || [],
});

export function TaskEditDialogForm({
  task,
  open,
  onOpenChange,
  onTaskUpdated,
}: TaskEditDialogFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkedEvents, setLinkedEvents] = useState<CalendarEventTask[]>([]);
  const [areEventsLoading, setAreEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const initialValues = useMemo(
    () => (task ? mapTaskToFormValues(task) : emptyFormValues),
    [task]
  );

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: initialValues,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = form;

  const priority = watch('priority');

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const handlePriorityChange = (value: 'low' | 'medium' | 'high') => {
    setValue('priority', value, { shouldDirty: true, shouldValidate: true });
  };

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
  }, [task?.id, open]);

  const handleDialogOpenChange = (isOpen: boolean) => {
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
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedTask = await taskService.updateTask(task.id, {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        priority: data.priority,
        project_id: data.project_id ?? null,
        plannedDurationMinutes: data.planned_duration_minutes,
        actualDurationMinutes: data.actual_duration_minutes ?? 0,
        blockedBy: data.blockedBy || [],
      });

      onTaskUpdated(updatedTask);
      toast.success('Task updated successfully');

      // PostHog: Capture task updated event
      posthog.capture('task_updated', {
        priority: data.priority,
        has_due_date: !!data.dueDate,
        has_project: !!data.project_id,
        planned_duration_minutes: data.planned_duration_minutes,
        has_dependencies: (data.blockedBy?.length || 0) > 0,
        linked_events_count: linkedEvents.length,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update task:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update task. Please try again.';
      toast.error(message);

      // PostHog: Capture task update error
      posthog.captureException(error instanceof Error ? error : new Error(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open && !!task} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[500px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          {task && (
            <DialogDescription>
              Update the fields below to change the details of{' '}
              <span className="font-medium">{task.title}</span>.
            </DialogDescription>
          )}
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <TaskTitleField register={register} errors={errors} />
              <TaskDescriptionField register={register} errors={errors} />
              <TaskDueDateField register={register} errors={errors} />
              <TaskPriorityField
                value={priority}
                onValueChange={handlePriorityChange}
                errors={errors}
              />
              <TaskProjectField errors={errors} />
              <TaskBlockedByField errors={errors} currentTaskId={task?.id} />
              <TaskDurationFields register={register} errors={errors} />
            </div>

            <div className="space-y-3 max-h-[10vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {!areEventsLoading && !eventsError && linkedEvents.length > 0
                    ? `${linkedEvents.length} `
                    : ''}
                  Linked calendar events
                </h3>
                {areEventsLoading && (
                  <Badge variant="outline" className="text-[10px] uppercase">
                    Loading...
                  </Badge>
                )}
              </div>
              {eventsError && (
                <p className="text-sm text-destructive">{eventsError}</p>
              )}
              {!areEventsLoading &&
                !eventsError &&
                linkedEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    This task is not linked to any calendar events.
                  </p>
                )}
              {linkedEvents.length > 0 && (
                <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {linkedEvents.map(event => (
                    <li
                      key={event.id}
                      className="rounded-md border border-muted bg-muted/40 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex align-center gap-2 items-baseline">
                            <p className="text-sm font-medium leading-snug">
                              {event.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {event.start_time.toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                              {' - '}
                              {formatEventTime(
                                event.start_time,
                                event.end_time
                              )}
                            </p>
                          </div>
                          {event.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {event.description}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-[11px]"
                        >
                          Linked
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <TaskFormActions
              isSubmitting={isSubmitting}
              onCancel={handleCancel}
              submitText="Save Changes"
              submittingText="Saving..."
              submitIcon={<Save className="mr-2 h-4 w-4" />}
              cancelText="Close"
            />
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
