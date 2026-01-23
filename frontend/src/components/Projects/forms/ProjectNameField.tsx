import { FormField } from '@/components/forms/shared';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { ProjectFormData } from '@/hooks/useProjectForm';

interface ProjectNameFieldProps {
  register: UseFormRegister<ProjectFormData>;
  errors: FieldErrors<ProjectFormData>;
  id?: string;
  className?: string;
  placeholder?: string;
}

export function ProjectNameField({
  register,
  errors,
  id = 'name',
  className = '',
  placeholder = 'Enter project name...',
}: ProjectNameFieldProps) {
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
