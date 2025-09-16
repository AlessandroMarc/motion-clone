import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import * as z from 'zod';
import type { Task } from '@/../../shared/types';
import { transformFormDataToTask } from '@/utils/formUtils';

// Form validation schema
export const taskSchema = z.object({
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

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: 'medium' as const,
      description: '',
      project_id: null,
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
      const taskData = transformFormDataToTask(data);
      console.log('useTaskForm: Calling onTaskCreate with:', taskData);
      await onTaskCreate(taskData);
      reset();
      toast.success('Task created successfully!');
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task. Please try again.');
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
