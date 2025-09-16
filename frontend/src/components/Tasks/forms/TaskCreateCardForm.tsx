import { useState } from 'react';
import { FormProvider } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTaskForm, type TaskCreateFormProps } from '@/hooks/useTaskForm';
import { TaskTitleField } from './TaskTitleField';
import { TaskDescriptionField } from './TaskDescriptionField';
import { TaskDueDateField } from './TaskDueDateField';
import { TaskPriorityField } from './TaskPriorityField';
import { TaskProjectField } from './TaskProjectField';
import { TaskFormActions } from './TaskFormActions';

export function TaskCreateCardForm({
  onTaskCreate,
  isLoading = false,
}: TaskCreateFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
    setIsExpanded(false);
  };

  const handleFormCancel = () => {
    handleCancel();
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors cursor-pointer">
        <CardContent className="flex items-center justify-center p-6">
          <Button
            variant="ghost"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded(true)}
          >
            <Plus className="h-4 w-4" />
            Add a new task...
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Create New Task</CardTitle>
        <CardDescription>Quickly add a new task to your list</CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="space-y-4">
              <TaskTitleField
                register={register}
                errors={errors}
                id="quick-title"
                placeholder="Enter task title..."
              />
              <TaskDescriptionField
                register={register}
                errors={errors}
                id="quick-description"
                rows={2}
              />

              <div className="grid grid-cols-2 gap-4">
                <TaskDueDateField
                  register={register}
                  errors={errors}
                  id="quick-dueDate"
                />
                <TaskPriorityField
                  value={priority}
                  onValueChange={setPriority}
                  errors={errors}
                  id="quick-priority"
                  placeholder="Select priority"
                />
              </div>

              <TaskProjectField errors={errors} />
            </div>

            <TaskFormActions
              isSubmitting={isSubmitting}
              onCancel={handleFormCancel}
            />
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
