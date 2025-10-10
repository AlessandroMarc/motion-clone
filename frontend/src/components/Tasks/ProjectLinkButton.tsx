import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Folder, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { Project } from '@/../../../shared/types';
import { ProjectSelectionPopover } from './ProjectSelectionPopover';

interface ProjectLinkButtonProps {
  availableProjects: Project[];
  onProjectSelect: (projectId: string) => void;
  onProjectUnlink: () => void;
  label?: string;
  projectId?: string;
}

export function ProjectLinkButton({
  availableProjects,
  onProjectSelect,
  onProjectUnlink,
  label,
  projectId,
}: ProjectLinkButtonProps) {
  const [isLinkingProject, setIsLinkingProject] = useState(false);

  const handleProjectSelect = (projectId: string) => {
    onProjectSelect(projectId);
    setIsLinkingProject(false);
  };

  const handleUnlink = (e: React.MouseEvent) => {
    e.stopPropagation();
    onProjectUnlink();
  };

  return (
    <div className="flex items-center gap-1 hover:text-foreground p-1">
      {isLinkingProject ? (
        <div className="flex items-center border rounded-md overflow-hidden">
          <ProjectSelectionPopover
            availableProjects={availableProjects}
            onProjectSelect={handleProjectSelect}
            onClose={() => setIsLinkingProject(false)}
          />
        </div>
      ) : (
        <div className="flex items-center border rounded-md overflow-hidden">
          {/* Project Name Section */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto font-normal px-3 py-2 text-muted-foreground hover:text-foreground border-0 rounded-none"
            onClick={() => setIsLinkingProject(true)}
          >
            <Folder className="h-3 w-3 text-muted-foreground mr-2" />
            {label ?? 'Link to project'}
          </Button>

          {/* Unlink Button (X) - only show if project is linked */}
          {label && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-0 rounded-none border-l"
              onClick={handleUnlink}
            >
              <X className="h-3 w-3" />
            </Button>
          )}

          {/* Go to Project Button - only show if project is linked */}
          {label && projectId && (
            <Link href={`/projects/${projectId}`}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-0 rounded-none border-l"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
