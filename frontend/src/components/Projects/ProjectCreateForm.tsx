'use client';

import { ProjectCreateDialogForm } from './forms';
import type { ProjectCreateFormProps } from '@/hooks/useProjectForm';

export function ProjectCreateForm(props: ProjectCreateFormProps) {
  return <ProjectCreateDialogForm {...props} />;
}
