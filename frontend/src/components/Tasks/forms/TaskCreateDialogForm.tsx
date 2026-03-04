import { useState } from 'react';
import { FormProvider } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  useTaskForm,
  type TaskCreateFormProps,
  type TaskFormData,
} from '@/hooks/useTaskForm';
import { TaskTitleField } from './TaskTitleField';
import { TaskDescriptionField } from './TaskDescriptionField';
import { TaskDueDateField } from './TaskDueDateField';
import { TaskPriorityField } from './TaskPriorityField';
import { TaskProjectField } from './TaskProjectField';
import { TaskScheduleField } from './TaskScheduleField';
import { TaskBlockedByField } from './TaskBlockedByField';
import { TaskFormActions } from './TaskFormActions';
import { TaskDurationFields } from './TaskDurationFields';
import { TaskRecurrenceFields } from './TaskRecurrenceFields';

export function TaskCreateDialogForm({ onTaskCreate }: TaskCreateFormProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    form,
    register,
    handleSubmit,
    errors,
    priority,
    isSubmitting,
    onSubmit,
    handleCancel,
    setPriority,
  } = useTaskForm(onTaskCreate);

  const isRecurring = form.watch('is_recurring');
  const recurrencePattern = form.watch('recurrence_pattern');
  const recurrenceInterval = form.watch('recurrence_interval');
  const recurrenceStartDate = form.watch('recurrenceStartDate');

  const handleFormSubmit = async (data: TaskFormData) => {
    const success = await onSubmit(data);
    if (success) {
      setIsDialogOpen(false);
    }
  };

  const handleFormCancel = () => {
    handleCancel();
    setIsDialogOpen(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-onboarding-step="create-task">
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your list. Fill in the details below to get
            started.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          {/* @ts-ignore - react-hook-form type inference issue with complex form data */}
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 overflow-y-auto flex-1 pr-1">
            <div className="space-y-4">
              <TaskTitleField register={register} errors={errors} />
              <TaskDescriptionField register={register} errors={errors} />
              {!isRecurring && (
                <TaskDueDateField register={register} errors={errors} />
              )}
              <TaskPriorityField
                value={priority}
                onValueChange={setPriority}
                errors={errors}
              />
              <TaskProjectField errors={errors} />
              <TaskScheduleField errors={errors} />
              <TaskBlockedByField errors={errors} />
              <TaskDurationFields
                register={register}
                errors={errors}
                hideActualDuration={isRecurring}
              />
              <TaskRecurrenceFields
                isRecurring={isRecurring}
                onIsRecurringChange={checked => {
                  form.setValue('is_recurring', checked);
                  if (checked) {
                    form.setValue('dueDate', '');
                    form.setValue('actual_duration_minutes', 0);
                    // Default start date to today if not already set
                    if (!form.getValues('recurrenceStartDate')) {
                      const today = new Date();
                      const yyyy = today.getFullYear();
                      const mm = String(today.getMonth() + 1).padStart(2, '0');
                      const dd = String(today.getDate()).padStart(2, '0');
                      form.setValue('recurrenceStartDate', `${yyyy}-${mm}-${dd}`);
                    }
                  }
                }}
                recurrencePattern={recurrencePattern}
                onPatternChange={value =>
                  form.setValue('recurrence_pattern', value)
                }
                recurrenceInterval={recurrenceInterval}
                onIntervalChange={value =>
                  form.setValue('recurrence_interval', value)
                }
                recurrenceStartDate={recurrenceStartDate}
                onRecurrenceStartDateChange={value =>
                  form.setValue('recurrenceStartDate', value)
                }
                errors={errors}
              />
            </div>

            <TaskFormActions
              isSubmitting={isSubmitting}
              onCancel={handleFormCancel}
            />
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
