import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { hasFieldError, getFieldError } from '@/utils/formUtils';
import type { FieldErrors } from 'react-hook-form';
import type { TaskFormData } from '@/hooks/useTaskForm';

interface TaskRecurrenceFieldsProps {
  isRecurring: boolean;
  onIsRecurringChange: (checked: boolean) => void;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly';
  onPatternChange: (value: 'daily' | 'weekly' | 'monthly') => void;
  recurrenceInterval?: number;
  onIntervalChange: (value: number) => void;
  errors: FieldErrors<TaskFormData>;
  className?: string;
}

export function TaskRecurrenceFields({
  isRecurring,
  onIsRecurringChange,
  recurrencePattern,
  onPatternChange,
  recurrenceInterval = 1,
  onIntervalChange,
  errors,
  className = '',
}: TaskRecurrenceFieldsProps) {
  const patternError = hasFieldError(errors, 'recurrence_pattern');
  const intervalError = hasFieldError(errors, 'recurrence_interval');
  const patternErrorMessage = getFieldError(errors, 'recurrence_pattern');
  const intervalErrorMessage = getFieldError(errors, 'recurrence_interval');

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toggle for recurring */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center gap-3">
          <Checkbox
            id="is_recurring"
            checked={isRecurring}
            onCheckedChange={onIsRecurringChange}
          />
          <Label htmlFor="is_recurring" className="cursor-pointer font-medium">
            Repeating Task
          </Label>
        </div>
      </div>

      {/* Recurrence pattern and interval (only shown when recurring) */}
      {isRecurring && (
        <div className="space-y-3 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 p-4">
          {/* Recurrence Pattern */}
          <div className="space-y-2">
            <Label htmlFor="recurrence_pattern">Pattern</Label>
            <Select
              value={recurrencePattern || ''}
              onValueChange={onPatternChange}
            >
              <SelectTrigger
                className={`${patternError ? 'border-red-500' : ''}`}
              >
                <SelectValue placeholder="Select pattern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {patternError && (
              <p className="text-sm text-red-500">{patternErrorMessage}</p>
            )}
          </div>

          {/* Recurrence Interval */}
          <div className="space-y-2">
            <Label htmlFor="recurrence_interval">Every</Label>
            <div className="flex items-center gap-2">
              <Input
                id="recurrence_interval"
                type="number"
                min="1"
                value={recurrenceInterval}
                onChange={e =>
                  onIntervalChange(Math.max(1, parseInt(e.target.value) || 1))
                }
                className={`w-20 ${intervalError ? 'border-red-500' : ''}`}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {recurrencePattern === 'daily' && 'day(s)'}
                {recurrencePattern === 'weekly' && 'week(s)'}
                {recurrencePattern === 'monthly' && 'month(s)'}
                {!recurrencePattern && 'period(s)'}
              </span>
            </div>
            {intervalError && (
              <p className="text-sm text-red-500">{intervalErrorMessage}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Events will be generated up to 90 days ahead when scheduled
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
