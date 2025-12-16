import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import * as z from 'zod';
import type { Task } from '@shared/types';
import { transformFormDataToTask } from '@/utils/formUtils';
import { useAuth } from '@/contexts/AuthContext';

// Form validation schema
export const taskSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(100, 'Title must be less than 100 characters'),
    description: z
      .string()
      .max(500, 'Description must be less than 500 characters'),
    dueDate: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']),
    project_id: z.string().nullable().optional(),
    planned_duration_minutes: z
      .number()
      .min(1, 'Planned duration must be at least 1 minute'),
    actual_duration_minutes: z
      .number()
      .min(0, 'Actual duration cannot be negative'),
    blockedBy: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.actual_duration_minutes > data.planned_duration_minutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['actual_duration_minutes'],
        message: 'Actual duration cannot exceed planned duration',
      });
    }
  });

export type TaskFormData = z.infer<typeof taskSchema>;

export interface TaskCreateFormProps {
  onTaskCreate: (
    task: Omit<
      Task,
      'id' | 'created_at' | 'updated_at' | 'status' | 'dependencies'
    >
  ) => Promise<void>;
  isLoading?: boolean;
}

export function useTaskForm(onTaskCreate: TaskCreateFormProps['onTaskCreate']) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: 'medium' as const,
      description: '',
      project_id: null,
      planned_duration_minutes: 60,
      actual_duration_minutes: 0,
      blockedBy: [],
    },
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

  const onSubmit = async (data: TaskFormData) => {
    console.log('useTaskForm: onSubmit called with data:', data);
    console.log('useTaskForm: Form values:', form.getValues());
    setIsSubmitting(true);
    try {
      if (!user) {
        throw new Error('User must be authenticated to create a task');
      }

      const taskData = transformFormDataToTask(data, user.id);
      console.log('useTaskForm: Calling onTaskCreate with:', taskData);
      await onTaskCreate(taskData);
      reset();
      toast.success('Task created successfully!');
      return true;
    } catch (error) {
      console.error('Failed to create task:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create task. Please try again.';
      toast.error(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
  };

  const setPriority = (value: 'low' | 'medium' | 'high') => {
    setValue('priority', value);
  };

  return {
    form,
    register,
    handleSubmit,
    errors,
    reset,
    priority,
    isSubmitting,
    onSubmit,
    handleCancel,
    setPriority,
  };
}
