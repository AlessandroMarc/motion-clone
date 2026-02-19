import { FormDateField } from '@/components/forms/shared';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { ProjectFormData } from '@/hooks/useProjectForm';

interface ProjectDeadlineFieldProps {
  register: UseFormRegister<ProjectFormData>;
  errors: FieldErrors<ProjectFormData>;
  id?: string;
  className?: string;
}

export function ProjectDeadlineField({
  register,
  errors,
  id = 'deadline',
  className = '',
}: ProjectDeadlineFieldProps) {
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
