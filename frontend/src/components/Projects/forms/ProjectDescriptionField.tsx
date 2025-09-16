import { FormTextarea } from '@/components/forms/shared';

interface ProjectDescriptionFieldProps {
  register: any;
  errors: any;
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
      register={register}
      errors={errors}
      name="description"
      label="Description"
      placeholder={placeholder}
      rows={rows}
      id={id}
      className={className}
    />
  );
}
