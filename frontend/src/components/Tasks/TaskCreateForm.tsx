'use client';

import {
  TaskCreateDialogForm,
  TaskCreateCardForm,
  type TaskCreateFormProps,
} from './forms';

export function TaskCreateForm(props: TaskCreateFormProps) {
  return <TaskCreateDialogForm {...props} />;
}

// Quick Task Creation Card (for inline creation)
export function QuickTaskCreateCard(props: TaskCreateFormProps) {
  return <TaskCreateCardForm {...props} />;
}
