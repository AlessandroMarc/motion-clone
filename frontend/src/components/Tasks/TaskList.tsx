'use client';

import { TaskListContainer } from './TaskListContainer';

interface TaskListProps {
  refreshTrigger?: number;
  onTaskUpdate?: () => void;
}

export function TaskList({ refreshTrigger, onTaskUpdate }: TaskListProps) {
  return (
    <TaskListContainer
      refreshTrigger={refreshTrigger}
      onTaskUpdate={onTaskUpdate}
    />
  );
}
