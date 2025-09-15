import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { hasFieldError, getFieldError } from '@/utils/formUtils';

interface TaskDescriptionFieldProps {
  register: any;
  errors: any;
  id?: string;
  className?: string;
  placeholder?: string;
  rows?: number;
}

export function TaskDescriptionField({
  register,
  errors,
  id = 'description',
  className = '',
  placeholder = 'Enter task description (optional)...',
  rows = 3,
}: TaskDescriptionFieldProps) {
  const hasError = hasFieldError(errors, 'description');
  const errorMessage = getFieldError(errors, 'description');

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Description</Label>
      <Textarea
        id={id}
        placeholder={placeholder}
        rows={rows}
        {...register('description')}
        className={`${hasError ? 'border-red-500' : ''} ${className}`}
      />
      {hasError && <p className="text-sm text-red-500">{errorMessage}</p>}
    </div>
  );
}
