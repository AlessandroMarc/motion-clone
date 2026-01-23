import { FormTextarea } from '@/components/forms/shared';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { ProjectFormData } from '@/hooks/useProjectForm';

interface ProjectDescriptionFieldProps {
  register: UseFormRegister<ProjectFormData>;
  errors: FieldErrors<ProjectFormData>;
  id?: string;
  className?: string;
  placeholder?: string;
  rows?: number;
}

export function ProjectDescriptionField({
  register,
  errors,
  id = 'description',
  className = '',
  placeholder = 'Enter project description (optional)...',
  rows = 3,
}: ProjectDescriptionFieldProps) {
  return (
    <FormTextarea
      register={register('description')}
      errors={errors as unknown as FieldErrors<Record<string, unknown>>}
      name="description"
      label="Description"
      placeholder={placeholder}
      rows={rows}
      id={id}
      className={className}
    />
  );
}
