import type { Project } from '@/../../../shared/types';
import { ProjectLinkButton } from './ProjectLinkButton';

interface TaskProjectSectionProps {
  project?: Project;
  availableProjects: Project[];
  onProjectSelect: (projectId: string) => void;
}

export function TaskProjectSection({
  project,
  availableProjects,
  onProjectSelect,
}: TaskProjectSectionProps) {
  return (
    <ProjectLinkButton
      availableProjects={availableProjects}
      onProjectSelect={onProjectSelect}
      label={project ? project.name : undefined}
    />
  );
}
