import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hasFieldError, getFieldError } from '@/utils/formUtils';

interface TaskTitleFieldProps {
  register: any;
  errors: any;
  id?: string;
  className?: string;
  placeholder?: string;
}

export function TaskTitleField({
  register,
  errors,
  id = 'title',
  className = '',
  placeholder = 'Enter task title...',
}: TaskTitleFieldProps) {
  const hasError = hasFieldError(errors, 'title');
  const errorMessage = getFieldError(errors, 'title');

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        Title <span className="text-red-500">*</span>
      </Label>
      <Input
        id={id}
        placeholder={placeholder}
        {...register('title')}
        className={`${hasError ? 'border-red-500' : ''} ${className}`}
      />
      {hasError && <p className="text-sm text-red-500">{errorMessage}</p>}
    </div>
  );
}
