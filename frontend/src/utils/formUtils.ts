import type { TaskFormData } from '@/hooks/useTaskForm';
import type { Task } from '@/../../shared/types';

/**
 * Transforms form data to task creation data
 */
export function transformFormDataToTask(
  data: TaskFormData
): Omit<
  Task,
  'id' | 'createdAt' | 'updatedAt' | 'status' | 'dependencies' | 'projectId'
> {
  return {
    title: data.title,
    description: data.description || '',
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    priority: data.priority,
  };
}

/**
 * Gets priority color class for UI display
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Gets priority display text
 */
export function getPriorityDisplayText(priority: string): string {
  switch (priority) {
    case 'high':
      return 'High Priority';
    case 'medium':
      return 'Medium Priority';
    case 'low':
      return 'Low Priority';
    default:
      return 'Unknown Priority';
  }
}

/**
 * Validates if a field has an error
 */
export function hasFieldError(errors: any, fieldName: string): boolean {
  return !!(errors && errors[fieldName]);
}

/**
 * Gets error message for a field
 */
export function getFieldError(
  errors: any,
  fieldName: string
): string | undefined {
  return errors?.[fieldName]?.message;
}
