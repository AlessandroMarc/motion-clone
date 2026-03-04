'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';
import { KanbanTaskCard } from './KanbanTaskCard';
import { TaskCreateDialogForm } from './forms';
import Link from 'next/link';

interface KanbanColumnProps {
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  linkedTaskIds: Set<string>;
  projectId: string | null;
  onDeleteTask: (taskId: string) => void;
  onSelectTask: (task: Task) => void;
  onTaskCreate: (
    taskData: Omit<
      Task,
      'id' | 'created_at' | 'updated_at' | 'status' | 'dependencies'
    >
  ) => Promise<void>;
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
  onTaskCreate,
  color,
}: KanbanColumnProps) {
  return (
    <div className="flex flex-col w-64 shrink-0">
      <Card className="flex flex-col h-full bg-muted/30">
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
              {tasks.length}
            </span>
          </div>
        </CardHeader>

        {/* Tasks + Add Task (inline) */}
        <CardContent className="flex-1 p-2 pt-0 overflow-y-auto">
          <div className="space-y-1.5">
            {tasks.map(task => (
              <KanbanTaskCard
                key={task.id}
                task={task}
                onDelete={onDeleteTask}
                onSelect={onSelectTask}
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
        </CardContent>
      </Card>
    </div>
  );
}
