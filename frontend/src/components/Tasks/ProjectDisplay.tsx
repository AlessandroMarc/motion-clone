import { Folder } from 'lucide-react';
import type { Project } from '@/types';

interface ProjectDisplayProps {
  project: Project;
}

export function ProjectDisplay({ project }: ProjectDisplayProps) {
  return (
    <div className="flex items-center gap-1">
      <Folder className="h-3 w-3 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{project.name}</span>
    </div>
  );
}

