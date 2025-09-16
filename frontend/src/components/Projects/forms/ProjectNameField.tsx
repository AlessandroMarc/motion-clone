import { FormField } from '@/components/forms/shared';

interface ProjectNameFieldProps {
  register: any;
  errors: any;
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
      register={register}
      errors={errors}
      name="name"
      label="Project Name"
      placeholder={placeholder}
      required
      id={id}
      className={className}
    />
  );
}
