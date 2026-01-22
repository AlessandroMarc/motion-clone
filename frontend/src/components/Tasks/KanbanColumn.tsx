'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import type { Task } from '@shared/types';
import { cn } from '@/lib/utils';
import { KanbanTaskCard } from './KanbanTaskCard';
import Link from 'next/link';

export interface KanbanColumnProps {
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  linkedTaskIds: Set<string>;
  projectId: string | null;
  onDeleteTask: (taskId: string) => void;
  onSelectTask: (task: Task) => void;
  onQuickCreateTask: (title: string, projectId: string | null) => Promise<void>;
  color?: string;
}

export function KanbanColumn({
  title,
  icon,
  tasks,
  linkedTaskIds,
  projectId,
  onDeleteTask,
  onSelectTask,
  onQuickCreateTask,
  color,
}: KanbanColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await onQuickCreateTask(newTaskTitle.trim(), projectId);
      setNewTaskTitle('');
      setIsAdding(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNewTaskTitle('');
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col w-64 shrink-0">
      <Card className="flex flex-col h-full bg-muted/30">
        {/* Column Header */}
        <CardHeader className="p-2.5 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={cn('p-1 rounded-md shrink-0', color || 'bg-muted')}>
                {icon}
              </div>
              {projectId ? (
                <Link
                  href={`/projects/${projectId}`}
                  className="text-xs font-semibold truncate hover:underline flex-1 min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {title}
                </Link>
              ) : (
                <CardTitle className="text-xs font-semibold truncate flex-1 min-w-0">
                  {title}
                </CardTitle>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
              {tasks.length}
            </span>
          </div>
        </CardHeader>

        {/* Tasks + Add Task (inline) */}
        <CardContent className="flex-1 p-2 pt-0 overflow-y-auto">
          <div className="space-y-1.5">
            {tasks.map((task) => (
              <KanbanTaskCard
                key={task.id}
                task={task}
                onDelete={onDeleteTask}
                onSelect={onSelectTask}
                isPlanned={linkedTaskIds.has(task.id)}
              />
            ))}

            {/* Add Task - right after tasks */}
            {isAdding ? (
              <form onSubmit={handleSubmit} className="space-y-1.5 pt-1">
                <Input
                  autoFocus
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="h-7 text-[11px]"
                  disabled={isSubmitting}
                />
                <div className="flex gap-1">
                  <Button
                    type="submit"
                    size="sm"
                    className="flex-1 h-6 text-[10px]"
                    disabled={!newTaskTitle.trim() || isSubmitting}
                  >
                    {isSubmitting ? 'Adding...' : 'Add'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-[10px] text-muted-foreground hover:text-foreground justify-start gap-1"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="h-3 w-3" />
                Add task
              </Button>
            )}

            {tasks.length === 0 && !isAdding && (
              <div className="py-4 text-center">
                <p className="text-[10px] text-muted-foreground">No tasks</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
