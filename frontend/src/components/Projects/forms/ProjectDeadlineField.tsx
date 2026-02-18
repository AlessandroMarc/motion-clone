import { useFormContext } from 'react-hook-form';
import { FormDateField } from '@/components/forms/shared';
import type { FieldErrors } from 'react-hook-form';
import type { ProjectFormData } from '@/hooks/useProjectForm';

interface ProjectDeadlineFieldProps {
  id?: string;
  className?: string;
}

export function ProjectDeadlineField({
  id = 'deadline',
  className = '',
}: ProjectDeadlineFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProjectFormData>();

  return (
    <FormDateField
      register={register('deadline')}
      errors={errors as unknown as FieldErrors<Record<string, unknown>>}
      name="deadline"
      label="Deadline"
      type="date"
      id={id}
      className={className}
    />
  );
}
