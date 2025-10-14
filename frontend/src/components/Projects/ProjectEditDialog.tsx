'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Edit3 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { ProjectNameField } from '@/components/Projects/forms/ProjectNameField';
import { ProjectDescriptionField } from '@/components/Projects/forms/ProjectDescriptionField';
import { ProjectDeadlineField } from '@/components/Projects/forms/ProjectDeadlineField';
import { ProjectFormActions } from '@/components/Projects/forms/ProjectFormActions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { projectService } from '@/services/projectService';
import type { Project, WorkItemStatus } from '@/../../../shared/types';

// Helper function to format date for input field
const formatDateForInput = (date: Date | null): string => {
  if (!date) return '';
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return new Date(date).toISOString().split('T')[0];
};

interface ProjectEditDialogProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

export function ProjectEditDialog({
  project,
  onProjectUpdate,
}: ProjectEditDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(project.status);

  const form = useForm({
    defaultValues: {
      name: project.name,
      description: project.description || '',
      deadline: formatDateForInput(project.deadline),
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = form;

  useEffect(() => {
    if (isDialogOpen) {
      reset({
        name: project.name,
        description: project.description || '',
        deadline: formatDateForInput(project.deadline),
      });
      setStatus(project.status);
    }
  }, [isDialogOpen, project, reset]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const updateData = {
        name: data.name,
        description: data.description || undefined,
        deadline: data.deadline ? new Date(data.deadline) : null,
        status: status as 'not-started' | 'in-progress' | 'completed',
      };

      const updatedProject = await projectService.updateProject(
        project.id,
        updateData
      );
      onProjectUpdate(updatedProject);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to update project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    setIsDialogOpen(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
        <Edit3 className="h-4 w-4 mr-2" />
        Edit
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update your project details below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <ProjectNameField register={register} errors={errors} />
              <ProjectDescriptionField register={register} errors={errors} />
              <ProjectDeadlineField register={register} errors={errors} />

              {/* Status Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={status}
                  onValueChange={(value: WorkItemStatus) => setStatus(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not-started">Not Started</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ProjectFormActions
              isSubmitting={isSubmitting}
              onCancel={handleCancel}
              submitText="Save Changes"
            />
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
