import type { ReactNode } from 'react';
import type { FieldErrors } from 'react-hook-form';
import type { TaskFormData } from '@/hooks/useTaskForm';
import type { CalendarEventTask } from '@/types';
import { TaskFormFields } from './TaskFormFields';
import { LinkedEventsSection } from './LinkedEventsSection';

interface TaskFormContentProps {
  errors: FieldErrors<TaskFormData>;
  currentTaskId?: string;
  /** When present, renders the linked-events section with these values. */
  linkedEvents?: CalendarEventTask[];
  areEventsLoading?: boolean;
  eventsError?: string | null;
  actions: ReactNode;
}

/**
 * Shared inner body used by both the create-card and edit-dialog form variants.
 * Renders the task fields, an optional linked-events section, and a caller-supplied
 * actions bar, so the two container components stay thin wrappers.
 */
export function TaskFormContent({
  errors,
  currentTaskId,
  linkedEvents,
  areEventsLoading,
  eventsError,
  actions,
}: TaskFormContentProps) {
  return (
    <>
      <TaskFormFields currentTaskId={currentTaskId} errors={errors} />
      {linkedEvents !== undefined && (
        <LinkedEventsSection
          events={linkedEvents}
          isLoading={areEventsLoading ?? false}
          error={eventsError ?? null}
        />
      )}
      {actions}
    </>
  );
}
