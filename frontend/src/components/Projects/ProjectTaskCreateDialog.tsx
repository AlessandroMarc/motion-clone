'use client';

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
import { useTaskForm, type TaskFormData } from '@/hooks/useTaskForm';
import { TaskTitleField } from '@/components/Tasks/forms/TaskTitleField';
import { TaskDescriptionField } from '@/components/Tasks/forms/TaskDescriptionField';
import { TaskDueDateField } from '@/components/Tasks/forms/TaskDueDateField';
import { TaskPriorityField } from '@/components/Tasks/forms/TaskPriorityField';
import { TaskFormActions } from '@/components/Tasks/forms/TaskFormActions';
import type { Task } from '@/types';

interface ProjectTaskCreateDialogProps {
  projectId: string;
  onTaskCreate: (
    taskData: Omit<
      Task,
      'id' | 'created_at' | 'updated_at' | 'status' | 'dependencies'
    >
  ) => Promise<void>;
  triggerText?: string;
}

export function ProjectTaskCreateDialog({
  projectId,
  onTaskCreate,
  triggerText = 'Add Task',
}: ProjectTaskCreateDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    form,
    register,
    handleSubmit,
    errors,
    priority,
    isSubmitting,
    onSubmit: originalOnSubmit,
    handleCancel,
    setPriority,
  } = useTaskForm(async data => {
    await onTaskCreate({
      ...data,
      project_id: projectId,
    });
    setIsDialogOpen(false);
  });

  const handleFormSubmit = async (data: TaskFormData) => {
    await originalOnSubmit(data);
  };

  const handleFormCancel = () => {
    handleCancel();
    setIsDialogOpen(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to this project. Fill in the details below to get
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
              {/* Project field is hidden since it's pre-populated */}
              <div className="hidden">
                <input {...register('project_id')} value={projectId} />
              </div>
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
