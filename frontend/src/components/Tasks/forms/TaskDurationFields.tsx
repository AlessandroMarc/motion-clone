import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hasFieldError, getFieldError } from '@/utils/formUtils';

interface TaskDurationFieldsProps {
  register: any;
  errors: any;
  plannedId?: string;
  actualId?: string;
}

export function TaskDurationFields({
  register,
  errors,
  plannedId = 'planned_duration_minutes',
  actualId = 'actual_duration_minutes',
}: TaskDurationFieldsProps) {
  const plannedHasError = hasFieldError(errors, 'planned_duration_minutes');
  const plannedError = getFieldError(errors, 'planned_duration_minutes');
  const actualHasError = hasFieldError(errors, 'actual_duration_minutes');
  const actualError = getFieldError(errors, 'actual_duration_minutes');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor={plannedId}>
          Planned Duration (minutes) <span className="text-red-500">*</span>
        </Label>
        <Input
          id={plannedId}
          type="number"
          min={1}
          step={1}
          {...register('planned_duration_minutes', { valueAsNumber: true })}
          className={plannedHasError ? 'border-red-500' : ''}
          placeholder="e.g. 60"
        />
        {plannedHasError && (
          <p className="text-sm text-red-500">{plannedError}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={actualId}>Actual Duration (minutes)</Label>
        <Input
          id={actualId}
          type="number"
          min={0}
          step={1}
          {...register('actual_duration_minutes', { valueAsNumber: true })}
          className={actualHasError ? 'border-red-500' : ''}
          placeholder="e.g. 45"
        />
        {actualHasError && (
          <p className="text-sm text-red-500">{actualError}</p>
        )}
      </div>
    </div>
  );
}
