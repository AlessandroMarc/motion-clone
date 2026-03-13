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
import {
  useTaskForm,
  type TaskCreateFormProps,
  type TaskFormData,
} from '@/hooks/useTaskForm';
import { TaskFormContent } from './TaskFormContent';
import { TaskFormActions } from './TaskFormActions';

export function TaskCreateCardForm({ onTaskCreate }: TaskCreateFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { form, handleSubmit, errors, isSubmitting, onSubmit, handleCancel } =
    useTaskForm(onTaskCreate);

  const handleFormSubmit = async (data: TaskFormData) => {
    const success = await onSubmit(data);
    if (success) {
      setIsExpanded(false);
    }
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
          {/* @ts-ignore - react-hook-form type inference issue with complex form data */}
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <TaskFormContent
              errors={errors}
              actions={
                <TaskFormActions
                  isSubmitting={isSubmitting}
                  onCancel={handleFormCancel}
                />
              }
            />
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
