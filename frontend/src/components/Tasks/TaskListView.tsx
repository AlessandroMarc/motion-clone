'use client';

import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Circle } from 'lucide-react';
import type { Project, Task } from '@shared/types';
import {
  ErrorState,
  LoadingState,
} from '@/components/shared';
import { ProjectKanbanBoard } from './ProjectKanbanBoard';
import { TaskEditDialogForm } from './forms';

interface TaskListViewProps {
  tasks: Task[];
  projects: Project[];
  linkedTaskIds: Set<string>;
  loading: boolean;
  error: string | null;
  onRetry: () => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onTaskUpdate: (updatedTask: Task, options?: { showToast?: boolean }) => void;
  onSelectTask: (task: Task) => void;
  onQuickCreateTask: (title: string, projectId: string | null) => Promise<void>;
  selectedTask: Task | null;
  detailsOpen: boolean;
  onDetailsOpenChange: (open: boolean) => void;
  onTaskUpdatedInDialog: (updatedTask: Task) => void;
}

export function TaskListView({
  tasks,
  projects,
  linkedTaskIds,
  loading,
  error,
  onRetry,
  onDeleteTask,
  onSelectTask,
  onQuickCreateTask,
  selectedTask,
  detailsOpen,
  onDetailsOpenChange,
  onTaskUpdatedInDialog,
}: TaskListViewProps) {
  if (loading) {
    return <LoadingState message="Loading tasks..." />;
  }

  if (error) {
    return (
      <ErrorState title="Error loading tasks" message={error} onRetry={onRetry} />
    );
  }

  if (tasks.length === 0 && projects.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Circle className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-subheading text-muted-foreground mb-2">
            No tasks yet
          </h3>
          <p className="text-sm font-body text-muted-foreground">
            Create your first task to get started with your productivity journey.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ProjectKanbanBoard
        tasks={tasks}
        projects={projects}
        linkedTaskIds={linkedTaskIds}
        onDeleteTask={(id) => {
          void onDeleteTask(id).catch(err => {
            toast.error(err instanceof Error ? err.message : 'Failed to delete task');
          });
        }}
        onSelectTask={onSelectTask}
        onQuickCreateTask={onQuickCreateTask}
      />

      <TaskEditDialogForm
        task={selectedTask}
        open={detailsOpen}
        onOpenChange={onDetailsOpenChange}
        onTaskUpdated={onTaskUpdatedInDialog}
      />
    </>
  );
}
