'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Circle } from 'lucide-react';
import type { Task, Project } from '@/../../../shared/types';
import { taskService } from '@/services/taskService';
import { projectService } from '@/services/projectService';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [fetchedTasks, fetchedProjects] = await Promise.all([
        taskService.getAllTasks(),
        projectService.getAllProjects(),
      ]);
      setTasks(fetchedTasks);
      setProjects(fetchedProjects);
    } catch (err) {
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
