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

export function ProjectCreateCardForm({
  onProjectCreate,
}: ProjectCreateFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { methods, handleSubmit, isSubmitting, onSubmit, handleCancel } =
    useProjectForm(onProjectCreate);

  const handleFormSubmit = async (data: ProjectFormData) => {
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
            <FolderPlus className="h-4 w-4" />
            Add a new project...
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Create New Project</CardTitle>
        <CardDescription>
          Quickly add a new project to organize your goals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="space-y-4">
              <ProjectNameField
                id="quick-name"
                placeholder="Enter project name..."
              />
              <ProjectDescriptionField id="quick-description" rows={2} />
              <ProjectDeadlineField id="quick-deadline" />
            </div>

            <ProjectFormActions
              isSubmitting={isSubmitting}
              onCancel={handleFormCancel}
            />
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
