import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Folder } from 'lucide-react';
import type { Project } from '@/../../../shared/types';
import { ProjectSelectionPopover } from './ProjectSelectionPopover';

interface ProjectLinkButtonProps {
  availableProjects: Project[];
  onProjectSelect: (projectId: string) => void;
  label?: string;
}

export function ProjectLinkButton({
  availableProjects,
  onProjectSelect,
  label,
}: ProjectLinkButtonProps) {
  const [isLinkingProject, setIsLinkingProject] = useState(false);

  const handleProjectSelect = (projectId: string) => {
    onProjectSelect(projectId);
    setIsLinkingProject(false);
  };

  return (
    <div className="flex items-center gap-1 hover:text-foreground p-1">
      {isLinkingProject ? (
        <ProjectSelectionPopover
          availableProjects={availableProjects}
          onProjectSelect={handleProjectSelect}
          onClose={() => setIsLinkingProject(false)}
        />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto font-normal p-2 text-muted-foreground"
          onClick={() => setIsLinkingProject(true)}
        >
          <Folder className="h-3 w-3 text-muted-foreground" />
          {label ?? 'Link to project'}
        </Button>
      )}
    </div>
  );
}
