'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';
import { KanbanTaskCard } from './KanbanTaskCard';
import { TaskCreateDialogForm } from './forms';
import Link from 'next/link';

export interface TaskGroup {
  label: string;
  projectId?: string | null;
  tasks: Task[];
  color?: string;
}

interface KanbanColumnProps {
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  linkedTaskIds: Set<string>;
  projectId: string | null;
  onDeleteTask: (taskId: string) => void;
  onSelectTask: (task: Task) => void;
  onToggleTaskCompletion: (task: Task, nextCompleted: boolean) => Promise<void>;
  onTaskCreate: (
    taskData: Omit<
      Task,
      'id' | 'created_at' | 'updated_at' | 'status' | 'dependencies'
    >
  ) => Promise<void>;
  color?: string;
  onDropTask?: (taskId: string) => void;
  groups?: TaskGroup[];
}

export function KanbanColumn({
  title,
  icon,
  tasks,
  linkedTaskIds,
  projectId,
  onDeleteTask,
  onSelectTask,
  onToggleTaskCompletion,
  onTaskCreate,
  color,
  onDropTask,
  groups,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (!onDropTask) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('application/x-kanban-task-id');
    if (taskId) onDropTask?.(taskId);
  };

  const totalCount = groups
    ? groups.reduce((sum, g) => sum + g.tasks.length, 0)
    : tasks.length;

  return (
    <div className="flex flex-col w-64 shrink-0">
      <Card
        className={cn(
          'flex flex-col h-full bg-muted/30 transition-colors',
          isDragOver && 'ring-2 ring-primary/40 bg-primary/5'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Column Header */}
        <CardHeader className="p-2.5 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className={cn('p-1 rounded-md shrink-0', color || 'bg-muted')}
              >
                {icon}
              </div>
              {projectId ? (
                <Link
                  href={`/projects/${projectId}`}
                  className="text-xs font-semibold truncate hover:underline flex-1 min-w-0"
                  onClick={e => e.stopPropagation()}
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
              {totalCount}
            </span>
          </div>
        </CardHeader>

        {/* Tasks */}
        <CardContent className="flex-1 p-2 pt-0 overflow-y-auto">
          {groups ? (
            <div className="space-y-3">
              {groups.map(group => (
                <div key={group.label}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {group.color && (
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          group.color
                        )}
                      />
                    )}
                    <span className="text-[10px] font-medium text-muted-foreground truncate">
                      {group.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground/60">
                      {group.tasks.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {group.tasks.map(task => (
                      <KanbanTaskCard
                        key={task.id}
                        task={task}
                        onDelete={onDeleteTask}
                        onSelect={onSelectTask}
                        onToggleCompletion={onToggleTaskCompletion}
                        isPlanned={linkedTaskIds.has(task.id)}
                      />
                    ))}
                    {group.tasks.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/50 pl-1">
                        No tasks
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <TaskCreateDialogForm
                onTaskCreate={onTaskCreate}
                initialProjectId={projectId}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-[10px] text-muted-foreground hover:text-foreground justify-start gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add task
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              {tasks.map(task => (
                <KanbanTaskCard
                  key={task.id}
                  task={task}
                  onDelete={onDeleteTask}
                  onSelect={onSelectTask}
                  onToggleCompletion={onToggleTaskCompletion}
                  isPlanned={linkedTaskIds.has(task.id)}
                />
              ))}

              <TaskCreateDialogForm
                onTaskCreate={onTaskCreate}
                initialProjectId={projectId}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-[10px] text-muted-foreground hover:text-foreground justify-start gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add task
                  </Button>
                }
              />

              {tasks.length === 0 && (
                <div className="py-4 text-center">
                  <p className="text-[10px] text-muted-foreground">No tasks</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
