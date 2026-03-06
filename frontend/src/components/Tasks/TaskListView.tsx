'use client';

import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Circle, LayoutList, Columns3 } from 'lucide-react';
import type { Project, Task } from '@/types';
import { ErrorState, LoadingState } from '@/components/shared';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { MobileTaskList } from './MobileTaskList';
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
  onTaskCreate: (
    taskData: Omit<
      Task,
      'id' | 'created_at' | 'updated_at' | 'status' | 'dependencies'
    >
  ) => Promise<void>;
  selectedTask: Task | null;
  detailsOpen: boolean;
  onDetailsOpenChange: (open: boolean) => void;
  onTaskUpdatedInDialog: (updatedTask: Task) => void;
  onTaskClonedInDialog: (clonedTask: Task) => void;
  viewType: 'list' | 'kanban';
  onViewTypeChange: (viewType: 'list' | 'kanban') => void;
  showCompleted: boolean;
  onShowCompletedChange: (show: boolean) => void;
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
  onTaskCreate,
  selectedTask,
  detailsOpen,
  onDetailsOpenChange,
  onTaskUpdatedInDialog,
  onTaskClonedInDialog,
  viewType,
  onViewTypeChange,
  showCompleted,
  onShowCompletedChange,
}: TaskListViewProps) {
  const isMobile = useIsMobile();

  if (loading) {
    return <LoadingState message="Loading tasks..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error loading tasks"
        message={error}
        onRetry={onRetry}
      />
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
            Create your first task to get started with your productivity
            journey.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {!isMobile && (
        <div className="flex gap-2 mb-4">
          <Button
            variant={viewType === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewTypeChange('list')}
            className="gap-2"
          >
            <LayoutList className="h-4 w-4" />
            List
          </Button>
          <Button
            variant={viewType === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewTypeChange('kanban')}
            className="gap-2"
          >
            <Columns3 className="h-4 w-4" />
            Kanban
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShowCompletedChange(!showCompleted)}
          >
            {showCompleted ? 'Hide completed' : 'Show completed'}
          </Button>
        </div>
      )}

      {isMobile && (
        <div className="mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShowCompletedChange(!showCompleted)}
          >
            {showCompleted ? 'Hide completed' : 'Show completed'}
          </Button>
        </div>
      )}

      {isMobile || viewType === 'list' ? (
        <MobileTaskList
          tasks={tasks}
          projects={projects}
          onSelectTask={onSelectTask}
          onDeleteTask={id => {
            void onDeleteTask(id).catch(err => {
              toast.error(
                err instanceof Error ? err.message : 'Failed to delete task'
              );
            });
          }}
          isDesktop={!isMobile}
        />
      ) : (
        <ProjectKanbanBoard
          tasks={tasks}
          projects={projects}
          linkedTaskIds={linkedTaskIds}
          onDeleteTask={id => {
            void onDeleteTask(id).catch(err => {
              toast.error(
                err instanceof Error ? err.message : 'Failed to delete task'
              );
            });
          }}
          onSelectTask={onSelectTask}
          onTaskCreate={onTaskCreate}
        />
      )}

      <TaskEditDialogForm
        task={selectedTask}
        open={detailsOpen}
        onOpenChange={onDetailsOpenChange}
        onTaskUpdated={onTaskUpdatedInDialog}
        onTaskCloned={onTaskClonedInDialog}
      />
    </>
  );
}
