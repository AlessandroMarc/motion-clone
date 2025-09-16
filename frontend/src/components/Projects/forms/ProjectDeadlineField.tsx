import { FormDateField } from '@/components/forms/shared';

interface ProjectDeadlineFieldProps {
  register: any;
  errors: any;
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
      register={register}
      errors={errors}
      name="deadline"
      label="Deadline"
      type="date"
      id={id}
      className={className}
    />
  );
}
