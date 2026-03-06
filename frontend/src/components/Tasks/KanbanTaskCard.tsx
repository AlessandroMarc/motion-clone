'use client';

import type { Task } from '@/types';
import { CompactTaskCard } from './CompactTaskCard';

interface KanbanTaskCardProps {
  task: Task;
  onDelete: (taskId: string) => void;
  onSelect?: (task: Task) => void;
  onToggleCompletion?: (task: Task, nextCompleted: boolean) => Promise<void>;
  isPlanned?: boolean;
}

export function KanbanTaskCard({
  task,
  onDelete,
  onSelect,
  onToggleCompletion,
  isPlanned = false,
}: KanbanTaskCardProps) {
  return (
    <CompactTaskCard
      task={task}
      isPlanned={isPlanned}
      onSelect={onSelect}
      onDelete={onDelete}
      onToggleCompletion={onToggleCompletion}
    />
  );
}
