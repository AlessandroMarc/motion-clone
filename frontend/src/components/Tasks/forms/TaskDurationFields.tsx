import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { DurationInput } from '@/components/shared/DurationInput';
import { getFieldError } from '@/utils/formUtils';
import type { FieldErrors } from 'react-hook-form';
import type { TaskFormData } from '@/hooks/useTaskForm';

interface TaskDurationFieldsProps {
  errors: FieldErrors<TaskFormData>;
  plannedId?: string;
  actualId?: string;
  hideActualDuration?: boolean;
}

export function TaskDurationFields({
  errors,
  plannedId = 'planned_duration_minutes',
  actualId = 'actual_duration_minutes',
  hideActualDuration = false,
}: TaskDurationFieldsProps) {
  const { setValue, watch } = useFormContext<TaskFormData>();
  const plannedValue = watch('planned_duration_minutes');
  const actualValue = watch('actual_duration_minutes');
  const plannedError = getFieldError(errors, 'planned_duration_minutes');
  const actualError = getFieldError(errors, 'actual_duration_minutes');

  const clampActualDuration = (value: number) => {
    const nonNegative = value < 0 ? 0 : value;

    if (typeof plannedValue !== 'number' || Number.isNaN(plannedValue)) {
      return nonNegative;
    }

    if (plannedValue < 0) {
      return 0;
    }

    return nonNegative > plannedValue ? plannedValue : nonNegative;
  };

  return (
    <div
      className={`grid grid-cols-1 ${hideActualDuration ? '' : 'md:grid-cols-2'} gap-4`}
    >
      <div className="space-y-2">
        <Label htmlFor={plannedId}>
          Planned Duration <span className="text-red-500">*</span>
        </Label>
        <DurationInput
          id={plannedId}
          value={plannedValue ?? 0}
          onChange={minutes =>
            setValue('planned_duration_minutes', minutes, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          min={1}
          error={plannedError}
          placeholder="e.g. 1 hr"
        />
      </div>

      {!hideActualDuration && (
        <div className="space-y-2">
          <Label htmlFor={actualId}>Actual Duration</Label>
          <DurationInput
            id={actualId}
            value={actualValue ?? 0}
            onChange={minutes =>
              setValue(
                'actual_duration_minutes',
                clampActualDuration(minutes),
                {
                  shouldValidate: true,
                  shouldDirty: true,
                }
              )
            }
            min={0}
            error={actualError}
            placeholder="e.g. 45 min"
          />
        </div>
      )}
    </div>
  );
}
