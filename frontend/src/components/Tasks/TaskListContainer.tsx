'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  isCalendarEventTask,
  type CalendarEventUnion,
  type Task,
  type WorkItemStatus,
} from '@/types';
import { taskService } from '@/services/taskService';
import { logger } from '@/lib/logger';
import { useTaskListData } from './useTaskListData';
import { TaskListView } from './TaskListView';
import { isTaskCompleted, sortTasksByPriority } from '@/utils/taskUtils';

interface TaskListContainerProps {
  refreshTrigger?: number;
  onTaskUpdate?: () => void;
}

export function TaskListContainer({
  refreshTrigger,
  onTaskUpdate,
}: TaskListContainerProps) {
  const { data, loading, error, reload } = useTaskListData(refreshTrigger);
  const projects = data?.projects ?? [];

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewType, setViewType] = useState<'list' | 'kanban'>('list');
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    setTasks(data?.tasks ?? []);
  }, [data]);

  const linkedTaskIds = useMemo(() => {
    const calendarEvents: CalendarEventUnion[] = data?.calendarEvents ?? [];
    return new Set(
      calendarEvents
        .filter(isCalendarEventTask)
        .map(ev => ev.linked_task_id)
        .filter(Boolean)
    );
  }, [data?.calendarEvents]);

  const visibleTasks = useMemo(() => {
    const filtered = showCompleted
      ? tasks
      : tasks.filter(task => !isTaskCompleted(task));
    return sortTasksByPriority(filtered);
  }, [showCompleted, tasks]);

  const handleDeleteTask = async (taskId: string) => {
    try {
      await taskService.deleteTask(taskId);
      await reload();
      onTaskUpdate?.();
      toast.success('Task deleted successfully');
    } catch (e) {
      logger.error('[TaskList] Failed to delete task', e);
      toast.error('Failed to delete task');
      throw e;
    }
  };

  const handleTaskUpdate = (
    updatedTask: Task,
    options: { showToast?: boolean } = {}
  ) => {
    // Lightweight optimistic update: keep dialog + list in sync without refetch.
    // If callers need canonical server state, they can trigger refreshTrigger.
    setTasks(prev =>
      prev.map(t => (t.id === updatedTask.id ? updatedTask : t))
    );
    onTaskUpdate?.();
    if (options.showToast !== false) {
      toast.success('Task updated successfully');
    }
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
      setTasks(prev =>
        prev.map(current =>
          current.id === updatedTask.id ? updatedTask : current
        )
      );
      onTaskUpdate?.();
      toast.success(nextCompleted ? 'Task completed' : 'Task reopened');
    } catch (error) {
      logger.error('[TaskList] Failed to toggle task completion', error);
      toast.error('Failed to update task');
    }
  };

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    setDetailsOpen(true);
  };

  const handleDetailsOpenChange = (open: boolean) => {
    setDetailsOpen(open);
    if (!open) setSelectedTask(null);
  };

  const handleTaskUpdatedInDialog = (updatedTask: Task) => {
    handleTaskUpdate(updatedTask, { showToast: false });
    setSelectedTask(updatedTask);
  };

  const handleTaskStatusChange = async (
    task: Task,
    newStatus: WorkItemStatus
  ) => {
    // Optimistic update: move the task immediately so the UI responds without waiting for the API
    setTasks(prev =>
      prev.map(t => (t.id === task.id ? { ...t, status: newStatus } : t))
    );
    try {
      let updatedTask: Task;
      if (newStatus === 'completed') {
        updatedTask = await taskService.setTaskCompleted(task, true);
      } else if (newStatus === 'not-started') {
        updatedTask = await taskService.updateTask(task.id, {
          actualDurationMinutes: 0,
        });
      } else {
        // in-progress: set a minimal actual duration (1 minute) to mark as started
        const planned = task.planned_duration_minutes ?? 0;
        updatedTask = await taskService.updateTask(task.id, {
          actualDurationMinutes: planned > 1 ? 1 : 0,
        });
      }
      // Reconcile with server response
      setTasks(prev =>
        prev.map(t => (t.id === updatedTask.id ? updatedTask : t))
      );
      onTaskUpdate?.();
    } catch (e) {
      // Revert on failure
      setTasks(prev => prev.map(t => (t.id === task.id ? task : t)));
      logger.error('[TaskList] Failed to update task status', e);
      toast.error('Failed to update task status');
    }
  };

  const handleTaskClonedInDialog = (clonedTask: Task) => {
    setTasks(prev => [...prev, clonedTask]);
    onTaskUpdate?.();
  };

  const handleTaskCreate = async (
    taskData: Omit<
      Task,
      'id' | 'created_at' | 'updated_at' | 'status' | 'dependencies'
    >
  ) => {
    try {
      await taskService.createTask({
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.due_date,
        priority: taskData.priority,
        scheduleId: taskData.schedule_id,
        project_id: taskData.project_id,
        blockedBy: taskData.blockedBy,
        plannedDurationMinutes: taskData.planned_duration_minutes,
        actualDurationMinutes: taskData.actual_duration_minutes,
        isRecurring: taskData.is_recurring,
        recurrencePattern: taskData.recurrence_pattern,
        recurrenceInterval: taskData.recurrence_interval,
        recurrenceStartDate: taskData.recurrence_start_date,
        isReminder: taskData.is_reminder,
      });
      await reload();
      onTaskUpdate?.();
      toast.success('Task created successfully');
    } catch (e) {
      logger.error('[TaskList] Failed to create task', e);
      toast.error('Failed to create task');
      throw e;
    }
  };

  return (
    <TaskListView
      tasks={visibleTasks}
      projects={projects}
      linkedTaskIds={linkedTaskIds}
      loading={loading}
      error={error}
      onRetry={reload}
      onDeleteTask={handleDeleteTask}
      onTaskUpdate={handleTaskUpdate}
      onSelectTask={handleSelectTask}
      onTaskCreate={handleTaskCreate}
      selectedTask={selectedTask}
      detailsOpen={detailsOpen}
      onDetailsOpenChange={handleDetailsOpenChange}
      onTaskUpdatedInDialog={handleTaskUpdatedInDialog}
      onTaskClonedInDialog={handleTaskClonedInDialog}
      viewType={viewType}
      onViewTypeChange={setViewType}
      showCompleted={showCompleted}
      onShowCompletedChange={setShowCompleted}
      onToggleTaskCompletion={handleToggleTaskCompletion}
      onTaskStatusChange={handleTaskStatusChange}
    />
  );
}
