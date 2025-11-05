'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Circle } from 'lucide-react';
import type { Task, Project, CalendarEvent } from '@/../../../shared/types';
import { taskService } from '@/services/taskService';
import { projectService } from '@/services/projectService';
import { calendarService } from '@/services/calendarService';
import {
  StatusGroupedList,
  EmptyStateCard,
  LoadingState,
  ErrorState,
} from '@/components/shared';
import { TASK_STATUS_CONFIG } from '@/utils/statusUtils';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  refreshTrigger?: number;
  onTaskUpdate?: () => void;
}

export function TaskList({ refreshTrigger, onTaskUpdate }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    console.log('[TaskList] fetchTasks called');
    try {
      setIsLoading(true);
      setError(null);
      const [fetchedTasks, fetchedProjects, fetchedCalendarEvents] =
        await Promise.all([
          taskService.getAllTasks(),
          projectService.getAllProjects(),
          calendarService.getAllCalendarEvents(),
        ]);

      console.log('[TaskList] Fetched data:', {
        tasksCount: fetchedTasks.length,
        taskIds: fetchedTasks.map(t => t.id),
        projectsCount: fetchedProjects.length,
        calendarEventsCount: fetchedCalendarEvents.length,
        linkedTaskIds: fetchedCalendarEvents
          .filter(e => e.linked_task_id)
          .map(e => e.linked_task_id),
      });

      setTasks(fetchedTasks);
      setProjects(fetchedProjects);
      setCalendarEvents(fetchedCalendarEvents);
    } catch (err) {
      console.error('[TaskList] Error fetching tasks:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch tasks';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [refreshTrigger]);

  // Filter out tasks that have calendar events linked to them (planned tasks)
  const linkedTaskIds = useMemo(() => {
    const ids = new Set(
      calendarEvents
        .filter(ev => !!ev.linked_task_id)
        .map(ev => ev.linked_task_id as string)
    );
    console.log(
      '[TaskList] Linked task IDs from calendar events:',
      Array.from(ids)
    );
    return ids;
  }, [calendarEvents]);

  const handleStatusToggle = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await taskService.updateTask(taskId, {
        status: newStatus as 'pending' | 'in-progress' | 'completed',
      });
      await fetchTasks();
      onTaskUpdate?.();
      toast.success(`Task marked as ${newStatus}`);
    } catch (err) {
      console.error('Failed to update task status:', err);
      toast.error('Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await taskService.deleteTask(taskId);
      await fetchTasks();
      onTaskUpdate?.();
      toast.success('Task deleted successfully');
    } catch (err) {
      console.error('Failed to delete task:', err);
      toast.error('Failed to delete task');
    }
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prevTasks =>
      prevTasks.map(task => (task.id === updatedTask.id ? updatedTask : task))
    );
    onTaskUpdate?.();
    toast.success('Task updated successfully');
  };

  if (isLoading) {
    return <LoadingState message="Loading tasks..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error loading tasks"
        message={error}
        onRetry={fetchTasks}
      />
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Circle className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No tasks yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Create your first task to get started with your productivity
            journey.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <StatusGroupedList
      items={tasks}
      statusConfig={TASK_STATUS_CONFIG}
      getItemStatus={task => task.status}
      renderItem={task => {
        const project = task.project_id
          ? projects.find(p => p.id === task.project_id)
          : undefined;
        console.log('TaskList renderItem:', {
          taskId: task.id,
          project_id: task.project_id,
          foundProject: project,
        });
        return (
          <TaskItem
            key={task.id}
            task={task}
            project={project}
            availableProjects={projects}
            onStatusToggle={handleStatusToggle}
            onDelete={handleDeleteTask}
            onTaskUpdate={handleTaskUpdate}
            isPlanned={linkedTaskIds.has(task.id)}
          />
        );
      }}
      renderEmptyState={statusConfig => (
        <EmptyStateCard
          key={statusConfig.key}
          statusConfig={statusConfig}
          message={`No ${statusConfig.label.toLowerCase()} tasks`}
        />
      )}
    />
  );
}
