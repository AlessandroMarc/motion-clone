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
import { FolderPlus } from 'lucide-react';
import {
  useProjectForm,
  type ProjectCreateFormProps,
  type ProjectFormData,
} from '@/hooks/useProjectForm';
import { ProjectNameField } from './ProjectNameField';
import { ProjectDescriptionField } from './ProjectDescriptionField';
import { ProjectDeadlineField } from './ProjectDeadlineField';
import { ProjectFormActions } from './ProjectFormActions';

export function ProjectCreateDialogForm({
  onProjectCreate,
}: ProjectCreateFormProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { methods, handleSubmit, isSubmitting, onSubmit, handleCancel } =
    useProjectForm(onProjectCreate);

  const handleFormSubmit = async (data: ProjectFormData) => {
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
        <Button
          className="w-full sm:w-auto gap-2"
          data-onboarding-step="create-project"
        >
          <FolderPlus className="h-4 w-4" />
          Create Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Add a new project to organize your larger goals. Fill in the details
            below to get started.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="space-y-4">
              <ProjectNameField />
              <ProjectDescriptionField />
              <ProjectDeadlineField />
            </div>

            <ProjectFormActions
              isSubmitting={isSubmitting}
              onCancel={handleFormCancel}
            />
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
