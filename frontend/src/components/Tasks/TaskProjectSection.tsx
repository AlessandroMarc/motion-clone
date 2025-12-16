import type { Project } from '@shared/types';
import { ProjectLinkButton } from './ProjectLinkButton';

interface TaskProjectSectionProps {
  project?: Project;
  availableProjects: Project[];
  onProjectSelect: (projectId: string) => void;
  onProjectUnlink: () => void;
}

export function TaskProjectSection({
  project,
  availableProjects,
  onProjectSelect,
  onProjectUnlink,
}: TaskProjectSectionProps) {
  return (
    <ProjectLinkButton
      availableProjects={availableProjects}
      onProjectSelect={onProjectSelect}
      onProjectUnlink={onProjectUnlink}
      label={project ? project.name : undefined}
      projectId={project?.id}
    />
  );
}
