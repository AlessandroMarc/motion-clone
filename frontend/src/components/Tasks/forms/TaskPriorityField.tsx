import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  hasFieldError,
  getFieldError,
  getPriorityColor,
} from '@/utils/formUtils';

interface TaskPriorityFieldProps {
  value: 'low' | 'medium' | 'high';
  onValueChange: (value: 'low' | 'medium' | 'high') => void;
  errors: any;
  id?: string;
  className?: string;
  placeholder?: string;
}

export function TaskPriorityField({
  value,
  onValueChange,
  errors,
  id = 'priority',
  className = '',
  placeholder = 'Select priority',
}: TaskPriorityFieldProps) {
  const hasError = hasFieldError(errors, 'priority');
  const errorMessage = getFieldError(errors, 'priority');

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Priority</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className={`${hasError ? 'border-red-500' : ''} ${className}`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="low">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${getPriorityColor('low')}`}
              />
              Low Priority
            </div>
          </SelectItem>
          <SelectItem value="medium">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${getPriorityColor('medium')}`}
              />
              Medium Priority
            </div>
          </SelectItem>
          <SelectItem value="high">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${getPriorityColor('high')}`}
              />
              High Priority
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      {hasError && <p className="text-sm text-red-500">{errorMessage}</p>}
    </div>
  );
}
