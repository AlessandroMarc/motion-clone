'use client';

import type { Task } from '@/types';
import { CompactTaskCard } from './CompactTaskCard';

interface KanbanTaskCardProps {
  task: Task;
  onDelete: (taskId: string) => void;
  onSelect?: (task: Task) => void;
  isPlanned?: boolean;
}

export function KanbanTaskCard({
  task,
  onDelete,
  onSelect,
  isPlanned = false,
}: KanbanTaskCardProps) {
  return (
    <CompactTaskCard
      task={task}
      isPlanned={isPlanned}
      onSelect={onSelect}
      onDelete={onDelete}
    />
  );
}
