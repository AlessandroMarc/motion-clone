import { useState } from 'react';
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
} from '@/hooks/useProjectForm';
import { ProjectNameField } from './ProjectNameField';
import { ProjectDescriptionField } from './ProjectDescriptionField';
import { ProjectDeadlineField } from './ProjectDeadlineField';
import { ProjectFormActions } from './ProjectFormActions';

export function ProjectCreateDialogForm({
  onProjectCreate,
}: ProjectCreateFormProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    errors,
    isSubmitting,
    onSubmit,
    handleCancel,
  } = useProjectForm(onProjectCreate);

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

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="space-y-4">
            <ProjectNameField register={register} errors={errors} />
            <ProjectDescriptionField register={register} errors={errors} />
            <ProjectDeadlineField register={register} errors={errors} />
          </div>

          <ProjectFormActions
            isSubmitting={isSubmitting}
            onCancel={handleFormCancel}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
