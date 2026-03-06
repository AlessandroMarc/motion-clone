'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, AlertCircle, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';
import {
  isTaskCompleted,
  isTaskOverdue,
  sortTasksByPriority,
  TASK_COMPLETED_CLASS,
  TASK_COMPLETED_OPACITY_CLASS,
} from '@/utils/taskUtils';
import {
  STATUS_CONFIG,
  PRIORITY_CONFIG,
} from '@/components/Tasks/taskCardConfig';
import {
  TaskCreateDialogForm,
  TaskEditDialogForm,
} from '@/components/Tasks/forms';
import { TaskCompletionDot } from '@/components/Tasks/TaskCompletionDot';
import { taskService } from '@/services/taskService';

interface ProjectTasksSectionProps {
  projectId: string;
  tasks: Task[];
  onTaskCreate: (
    taskData: Omit<
      Task,
      'id' | 'created_at' | 'updated_at' | 'status' | 'dependencies'
    >
  ) => Promise<void>;
  onTaskUnlink: (taskId: string) => Promise<void>;
  onTaskUpdate?: (updatedTask: Task) => void;
  onTaskClone?: (clonedTask: Task) => void;
}

interface ProjectTaskRowProps {
  task: Task;
  onOpenTask: (task: Task) => void;
  onUnlinkTask: (taskId: string) => void;
  onToggleTaskCompletion: (task: Task, nextCompleted: boolean) => Promise<void>;
}

function ProjectTaskRow({
  task,
  onOpenTask,
  onUnlinkTask,
  onToggleTaskCompletion,
}: ProjectTaskRowProps): React.ReactElement {
  const isCompleted = isTaskCompleted(task);
  const taskIsOverdue = isTaskOverdue(task);
  const statusConfig =
    STATUS_CONFIG[task.status] ?? STATUS_CONFIG['not-started'];
  const priorityConfig =
    PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG['medium'];
  const [isPreviewingComplete, setIsPreviewingComplete] = useState(false);

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg border transition-all',
        'hover:bg-accent/30 hover:border-accent cursor-pointer',
        isCompleted && TASK_COMPLETED_OPACITY_CLASS
      )}
      onClick={() => onOpenTask(task)}
    >
      <TaskCompletionDot
        completed={isCompleted}
        onToggle={nextCompleted => onToggleTaskCompletion(task, nextCompleted)}
        onPreviewChange={setIsPreviewingComplete}
        className={cn('mt-0.5', statusConfig.className)}
      />

      <div className="flex-1 min-w-0">
        <h4
          className={cn(
            'text-sm font-medium',
            (isCompleted || isPreviewingComplete) && TASK_COMPLETED_CLASS
          )}
        >
          {task.title}
        </h4>

        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {task.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium',
              priorityConfig.bgClass
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                priorityConfig.dotClass
              )}
            />
            {priorityConfig.label}
          </span>

          {task.planned_duration_minutes > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {task.planned_duration_minutes}m
              {task.actual_duration_minutes > 0 && (
                <span className="opacity-70">
                  / {task.actual_duration_minutes}m
                </span>
              )}
            </span>
          )}

          {task.due_date && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs',
                taskIsOverdue ? 'text-red-500' : 'text-muted-foreground'
              )}
            >
              <Calendar className="h-3 w-3" />
              {formatDate(task.due_date)}
              {taskIsOverdue && <AlertCircle className="h-3 w-3" />}
            </span>
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
        onClick={e => {
          e.stopPropagation();
          onUnlinkTask(task.id);
        }}
        title="Unlink from project"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function ProjectTasksSection({
  projectId,
  tasks,
  onTaskCreate,
  onTaskUnlink,
  onTaskUpdate,
  onTaskClone,
}: ProjectTasksSectionProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const visibleTasks = useMemo(() => {
    const filtered = showCompleted
      ? tasks
      : tasks.filter(task => !isTaskCompleted(task));
    return sortTasksByPriority(filtered);
  }, [showCompleted, tasks]);

  const handleTaskCreate = async (
    taskData: Omit<
      Task,
      'id' | 'created_at' | 'updated_at' | 'status' | 'dependencies'
    >
  ) => {
    await onTaskCreate(taskData);
  };

  const handleUnlinkTask = async (taskId: string) => {
    await onTaskUnlink(taskId);
  };

  const handleTaskClick = (task: Task) => {
    console.log('🖱️ [ProjectTasksSection] Task clicked:', task.id, task.title);
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    console.log(
      '✅ [ProjectTasksSection] Task updated callback received:',
      updatedTask.id,
      updatedTask.title
    );
    onTaskUpdate?.(updatedTask);
    console.log('🔄 [ProjectTasksSection] Called onTaskUpdate callback');
    setIsEditDialogOpen(false);
    setSelectedTask(null);
    console.log('🔌 [ProjectTasksSection] Dialog and selection cleared');
  };

  const handleToggleTaskCompletion = async (
    task: Task,
    nextCompleted: boolean
  ) => {
    try {
      const updatedTask = await taskService.setTaskCompleted(
        task,
        nextCompleted
      );
      onTaskUpdate?.(updatedTask);
      toast.success(nextCompleted ? 'Task completed' : 'Task reopened');
    } catch (error) {
      toast.error('Failed to update task');
      console.error('Failed to toggle task completion:', error);
    }
  };

  return (
    <Card>
      <CardHeader className="pt-4">
        <CardTitle className="text-xl font-semibold">Project Tasks</CardTitle>
        <CardAction className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCompleted(prev => !prev)}
          >
            {showCompleted ? 'Hide completed' : 'Show completed'}
          </Button>
          <TaskCreateDialogForm
            onTaskCreate={handleTaskCreate}
            initialProjectId={projectId}
            trigger={
              <Button size="lg" className="gap-2">
                Add Task
              </Button>
            }
          />
        </CardAction>
      </CardHeader>
      <CardContent className="pb-4">
        {visibleTasks.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground mb-4">No tasks to show.</p>
            <TaskCreateDialogForm
              onTaskCreate={handleTaskCreate}
              initialProjectId={projectId}
              trigger={
                <Button size="lg" className="gap-2">
                  Create First Task
                </Button>
              }
            />
          </div>
        ) : (
          <div className="space-y-2">
            {visibleTasks.map(task => (
              <ProjectTaskRow
                key={task.id}
                task={task}
                onOpenTask={handleTaskClick}
                onUnlinkTask={handleUnlinkTask}
                onToggleTaskCompletion={handleToggleTaskCompletion}
              />
            ))}
          </div>
        )}
      </CardContent>

      <TaskEditDialogForm
        task={selectedTask}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onTaskUpdated={handleTaskUpdated}
        onTaskCloned={onTaskClone}
      />
    </Card>
  );
}
