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
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-kanban-task-id', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <CompactTaskCard
      task={task}
      isPlanned={isPlanned}
      onSelect={onSelect}
      onDelete={onDelete}
      onToggleCompletion={onToggleCompletion}
      draggable
      showDragHandle
      onDragStart={handleDragStart}
    />
  );
}
