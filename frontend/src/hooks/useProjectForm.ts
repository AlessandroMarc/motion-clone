import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Project, WorkItemStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { normalizeToMidnight, parseLocalDate } from '@/utils/dateUtils';
import { captureEvent } from '@/lib/analytics';
import {
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_NAME_MIN_LENGTH,
  PROJECT_DESCRIPTION_MAX_LENGTH,
} from '@shared/validation';

// Project form schema
export const projectSchema = z.object({
  name: z
    .string()
    .min(PROJECT_NAME_MIN_LENGTH, 'Project name is required')
    .max(
      PROJECT_NAME_MAX_LENGTH,
      `Project name must be at most ${PROJECT_NAME_MAX_LENGTH} characters`
    ),
  description: z
    .string()
    .max(
      PROJECT_DESCRIPTION_MAX_LENGTH,
      `Description must be at most ${PROJECT_DESCRIPTION_MAX_LENGTH} characters`
    )
    .optional(),
  deadline: z.string().optional(),
  scheduleId: z.string().optional(),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

export interface ProjectCreateFormProps {
  onProjectCreate: (
    projectData: Omit<
      Project,
      'id' | 'created_at' | 'updated_at' | 'milestones' | 'status'
    >
  ) => Promise<void>;
  isLoading?: boolean;
}

export function useProjectForm(
  onProjectCreate: ProjectCreateFormProps['onProjectCreate']
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { advanceToNextStep } = useOnboarding();

  const methods = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      deadline: '',
      scheduleId: '',
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = methods;

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
        deadline: data.deadline
          ? normalizeToMidnight(parseLocalDate(data.deadline))
          : null,
        schedule_id: data.scheduleId || undefined,
        status: 'not-started' as WorkItemStatus,
        user_id: user.id,
      };

      await onProjectCreate(projectData);

      // Reset form on success
      reset();
      toast.success('Project created successfully!');

      // PostHog: Capture project created event
      captureEvent('project_created', {
        has_description: !!data.description,
        has_deadline: !!data.deadline,
      });

      // Advance onboarding step if in onboarding flow
      try {
        await advanceToNextStep('project');
      } catch (error) {
        // Silently fail - onboarding advancement is not critical
        console.error('Failed to advance onboarding step:', error);
      }
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
    methods,
    register,
    handleSubmit,
    errors,
    isSubmitting,
    onSubmit,
    handleCancel,
  };
}
