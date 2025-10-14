import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Project, WorkItemStatus } from '@/../../../shared/types';
import { useAuth } from '@/contexts/AuthContext';

// Project form schema
export const projectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters'),
  description: z.string().optional(),
  deadline: z.string().optional(),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

export interface ProjectCreateFormProps {
  onProjectCreate: (
    projectData: Omit<
      Project,
      'id' | 'createdAt' | 'updatedAt' | 'milestones' | 'status'
    >
  ) => Promise<void>;
  isLoading?: boolean;
}

export function useProjectForm(
  onProjectCreate: ProjectCreateFormProps['onProjectCreate']
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      deadline: '',
    },
  });

  const onSubmit = async (data: ProjectFormData) => {
    try {
      setIsSubmitting(true);

      if (!user) {
        throw new Error('User must be authenticated to create a project');
      }

      // Transform form data to project format
      const projectData = {
        name: data.name,
        description: data.description || undefined,
        deadline: data.deadline ? new Date(data.deadline) : null,
        status: 'not-started' as WorkItemStatus,
        user_id: user.id,
      };

      await onProjectCreate(projectData);

      // Reset form on success
      reset();
      toast.success('Project created successfully!');
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
  };

  return {
    register,
    handleSubmit,
    errors,
    isSubmitting,
    onSubmit,
    handleCancel,
  };
}
