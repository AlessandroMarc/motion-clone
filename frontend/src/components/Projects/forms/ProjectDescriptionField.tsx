import { useFormContext } from 'react-hook-form';
import { FormTextarea } from '@/components/forms/shared';
import type { FieldErrors } from 'react-hook-form';
import type { ProjectFormData } from '@/hooks/useProjectForm';

interface ProjectDescriptionFieldProps {
  id?: string;
  className?: string;
  placeholder?: string;
  rows?: number;
}

export function ProjectDescriptionField({
  id = 'description',
  className = '',
  placeholder = 'Enter project description (optional)...',
  rows = 3,
}: ProjectDescriptionFieldProps) {
  const { register, formState: { errors } = { errors: {} } } =
    useFormContext<ProjectFormData>() || {};

  return (
    <FormTextarea
      register={register ? register('description') : ({} as any)}
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
