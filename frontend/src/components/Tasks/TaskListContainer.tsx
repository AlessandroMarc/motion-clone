'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { isCalendarEventTask, type CalendarEventUnion, type Task } from '@shared/types';
import { taskService } from '@/services/taskService';
import { logger } from '@/lib/logger';
import { useTaskListData } from './useTaskListData';
import { TaskListView } from './TaskListView';

interface TaskListContainerProps {
  refreshTrigger?: number;
  onTaskUpdate?: () => void;
}

export function TaskListContainer({ refreshTrigger, onTaskUpdate }: TaskListContainerProps) {
  const { data, loading, error, reload } = useTaskListData(refreshTrigger);
  const projects = data?.projects ?? [];

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  const handleTaskUpdate = (updatedTask: Task, options: { showToast?: boolean } = {}) => {
    // Lightweight optimistic update: keep dialog + list in sync without refetch.
    // If callers need canonical server state, they can trigger refreshTrigger.
    setTasks(prev => prev.map(t => (t.id === updatedTask.id ? updatedTask : t)));
    onTaskUpdate?.();
    if (options.showToast !== false) {
      toast.success('Task updated successfully');
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

  const handleQuickCreateTask = async (title: string, projectId: string | null) => {
    try {
      await taskService.createTask({
        title,
        project_id: projectId ?? undefined,
        priority: 'medium',
        plannedDurationMinutes: 30,
        actualDurationMinutes: 0,
      });
      await reload();
      onTaskUpdate?.();
      toast.success('Task created');
    } catch (e) {
      logger.error('[TaskList] Failed to create task', e);
      toast.error('Failed to create task');
      throw e;
    }
  };

  return (
    <TaskListView
      tasks={tasks}
      projects={projects}
      linkedTaskIds={linkedTaskIds}
      loading={loading}
      error={error}
      onRetry={reload}
      onDeleteTask={handleDeleteTask}
      onTaskUpdate={handleTaskUpdate}
      onSelectTask={handleSelectTask}
      onQuickCreateTask={handleQuickCreateTask}
      selectedTask={selectedTask}
      detailsOpen={detailsOpen}
      onDetailsOpenChange={handleDetailsOpenChange}
      onTaskUpdatedInDialog={handleTaskUpdatedInDialog}
    />
  );
}
