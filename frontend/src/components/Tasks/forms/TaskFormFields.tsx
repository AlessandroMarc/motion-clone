import { useFormContext } from 'react-hook-form';
import type { TaskFormData } from '@/hooks/useTaskForm';
import type { FieldErrors } from 'react-hook-form';
import { TaskTitleField } from './TaskTitleField';
import { TaskDescriptionField } from './TaskDescriptionField';
import { TaskDueDateField } from './TaskDueDateField';
import { TaskStartDateField } from './TaskStartDateField';
import { TaskPriorityField } from './TaskPriorityField';
import { TaskProjectField } from './TaskProjectField';
import { TaskScheduleField } from './TaskScheduleField';
import { TaskBlockedByField } from './TaskBlockedByField';
import { TaskDurationFields } from './TaskDurationFields';
import { TaskRecurrenceFields } from './TaskRecurrenceFields';

interface TaskFormFieldsProps {
  currentTaskId?: string;
  errors: FieldErrors<TaskFormData>;
}

export function TaskFormFields({ currentTaskId, errors }: TaskFormFieldsProps) {
  const { register, setValue, watch } = useFormContext<TaskFormData>();

  const priority = watch('priority');
  const isRecurring = watch('is_recurring');
  const recurrencePattern = watch('recurrence_pattern');
  const recurrenceInterval = watch('recurrence_interval');
  const recurrenceStartDate = watch('recurrenceStartDate');

  const handlePriorityChange = (value: 'low' | 'medium' | 'high') => {
    setValue('priority', value, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
        <div className="md:col-span-2">
          <TaskTitleField register={register} errors={errors} />
        </div>
        <div className="md:col-span-2">
          <TaskDescriptionField register={register} errors={errors} />
        </div>
        {!isRecurring && (
          <TaskDueDateField register={register} errors={errors} />
        )}
        <TaskStartDateField register={register} errors={errors} />
        <TaskPriorityField
          value={priority}
          onValueChange={handlePriorityChange}
          errors={errors}
        />
        <TaskProjectField errors={errors} />
        <TaskScheduleField errors={errors} />
        <TaskBlockedByField errors={errors} currentTaskId={currentTaskId} />
        <div className="md:col-span-2">
          <TaskDurationFields
            errors={errors}
            hideActualDuration={isRecurring}
          />
        </div>
        <div className="md:col-span-2">
          <TaskRecurrenceFields
            isRecurring={isRecurring}
            onIsRecurringChange={checked => {
              setValue('is_recurring', checked, {
                shouldDirty: true,
                shouldValidate: true,
              });
              if (checked) {
                setValue('dueDate', undefined, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setValue('actual_duration_minutes', 0, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
            }}
            recurrencePattern={recurrencePattern}
            onPatternChange={value =>
              setValue('recurrence_pattern', value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            recurrenceInterval={recurrenceInterval}
            onIntervalChange={value =>
              setValue('recurrence_interval', value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            recurrenceStartDate={recurrenceStartDate}
            onRecurrenceStartDateChange={value =>
              setValue('recurrenceStartDate', value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            errors={errors}
          />
        </div>
      </div>
    </div>
  );
}
