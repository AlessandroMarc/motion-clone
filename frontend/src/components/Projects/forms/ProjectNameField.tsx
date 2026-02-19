import { useFormContext } from 'react-hook-form';
import { FormField } from '@/components/forms/shared';
import type { FieldErrors } from 'react-hook-form';
import type { ProjectFormData } from '@/hooks/useProjectForm';

interface ProjectNameFieldProps {
  id?: string;
  className?: string;
  placeholder?: string;
}

export function ProjectNameField({
  id = 'name',
  className = '',
  placeholder = 'Enter project name...',
}: ProjectNameFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProjectFormData>();

  return (
    <FormField
      register={register('name')}
      errors={errors as unknown as FieldErrors<Record<string, unknown>>}
      name="name"
      label="Project Name"
      placeholder={placeholder}
      required
      id={id}
      className={className}
    />
  );
}
