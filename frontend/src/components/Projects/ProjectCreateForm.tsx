'use client';

import {
  ProjectCreateDialogForm,
  ProjectCreateCardForm,
  type ProjectCreateFormProps,
} from './forms';

export function ProjectCreateForm(props: ProjectCreateFormProps) {
  return <ProjectCreateDialogForm {...props} />;
}

// Quick Project Creation Card (for inline creation)
export function QuickProjectCreateCard(props: ProjectCreateFormProps) {
  return <ProjectCreateCardForm {...props} />;
}
