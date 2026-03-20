'use client';

import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Circle, LayoutList, Columns3 } from 'lucide-react';
import type { Project, Task, WorkItemStatus } from '@/types';
import { ErrorState, LoadingState } from '@/components/shared';
import { fadeInScale } from '@/lib/animations';
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
  onToggleTaskCompletion: (task: Task, nextCompleted: boolean) => Promise<void>;
  onTaskStatusChange: (task: Task, newStatus: WorkItemStatus) => Promise<void>;
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
  onToggleTaskCompletion,
  onTaskStatusChange,
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
      <motion.div variants={fadeInScale} initial="initial" animate="animate">
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ delay: 2, duration: 0.5, ease: 'easeInOut' }}
            >
              <Circle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            </motion.div>
            <h3 className="text-lg font-subheading text-muted-foreground mb-2">
              No tasks yet
            </h3>
            <p className="text-sm font-body text-muted-foreground">
              Create your first task to get started with your productivity
              journey.
            </p>
          </CardContent>
        </Card>
      </motion.div>
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
          onToggleTaskCompletion={onToggleTaskCompletion}
          onDeleteTask={id => {
            void onDeleteTask(id).catch(err => {
              toast.error(
                err instanceof Error ? err.message : 'Failed to delete task'
              );
            });
          }}
          onTaskCreate={onTaskCreate}
          isDesktop={!isMobile}
        />
      ) : (
        <ProjectKanbanBoard
          tasks={tasks}
          projects={projects}
          linkedTaskIds={linkedTaskIds}
          onToggleTaskCompletion={onToggleTaskCompletion}
          onDeleteTask={id => {
            void onDeleteTask(id).catch(err => {
              toast.error(
                err instanceof Error ? err.message : 'Failed to delete task'
              );
            });
          }}
          onSelectTask={onSelectTask}
          onTaskCreate={onTaskCreate}
          onTaskStatusChange={onTaskStatusChange}
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
