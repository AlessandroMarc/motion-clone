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
import { useTaskForm, type TaskCreateFormProps } from '@/hooks/useTaskForm';
import { TaskTitleField } from './TaskTitleField';
import { TaskDescriptionField } from './TaskDescriptionField';
import { TaskDueDateField } from './TaskDueDateField';
import { TaskPriorityField } from './TaskPriorityField';
import { TaskProjectField } from './TaskProjectField';
import { TaskFormActions } from './TaskFormActions';

export function TaskCreateDialogForm({
  onTaskCreate,
  isLoading = false,
}: TaskCreateFormProps) {
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

  const handleFormSubmit = async (data: any) => {
    await onSubmit(data);
    setIsDialogOpen(false);
  };

  const handleFormCancel = () => {
    handleCancel();
    setIsDialogOpen(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your list. Fill in the details below to get
            started.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="space-y-4">
              <TaskTitleField register={register} errors={errors} />
              <TaskDescriptionField register={register} errors={errors} />
              <TaskDueDateField register={register} errors={errors} />
              <TaskPriorityField
                value={priority}
                onValueChange={setPriority}
                errors={errors}
              />
              <TaskProjectField errors={errors} />
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
