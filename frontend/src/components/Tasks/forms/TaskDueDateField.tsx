import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';
import { hasFieldError, getFieldError } from '@/utils/formUtils';

interface TaskDueDateFieldProps {
  register: any;
  errors: any;
  id?: string;
  className?: string;
}

export function TaskDueDateField({
  register,
  errors,
  id = 'dueDate',
  className = '',
}: TaskDueDateFieldProps) {
  const hasError = hasFieldError(errors, 'dueDate');
  const errorMessage = getFieldError(errors, 'dueDate');

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Due Date</Label>
      <div className="relative">
        <Input
          id={id}
          type="datetime-local"
          {...register('dueDate')}
          className={`${hasError ? 'border-red-500' : ''} ${className}`}
        />
        <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {hasError && <p className="text-sm text-red-500">{errorMessage}</p>}
    </div>
  );
}
