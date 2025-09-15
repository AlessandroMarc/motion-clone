'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react';
import type { Task } from '@/../../../shared/types';
import { taskService } from '@/services/taskService';

interface TaskListProps {
  refreshTrigger?: number;
  onTaskUpdate?: () => void;
}

export function TaskList({ refreshTrigger, onTaskUpdate }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedTasks = await taskService.getAllTasks();
      setTasks(fetchedTasks);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'No due date';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = (dueDate: Date | string | null) => {
    if (!dueDate) return false;
    const dateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    return dateObj < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading tasks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-2 p-6">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="font-medium text-red-800">Error loading tasks</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchTasks}>
            Retry
          </Button>
        </CardContent>
      </Card>
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
    <div className="space-y-4">
      {tasks.map(task => (
        <Card key={task.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() =>
                    handleStatusToggle(task.id, task.status)
                  }
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <CardTitle
                    className={`text-lg ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {task.title}
                  </CardTitle>
                  {task.description && (
                    <CardDescription className="mt-1">
                      {task.description}
                    </CardDescription>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${getPriorityColor(task.priority)}`}
                />
                <Badge variant="secondary" className="text-xs">
                  {task.priority}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  {getStatusIcon(task.status)}
                  <span className="capitalize">
                    {task.status.replace('-', ' ')}
                  </span>
                </div>

                {task.dueDate && (
                  <div
                    className={`flex items-center gap-1 ${isOverdue(task.dueDate) && task.status !== 'completed' ? 'text-red-500' : ''}`}
                  >
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(task.dueDate)}</span>
                    {isOverdue(task.dueDate) && task.status !== 'completed' && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
