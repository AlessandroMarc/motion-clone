'use client';

import { useState } from 'react';
import { TaskCreateForm, TaskList } from '@/components/Tasks';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import type { Task } from '@/../../../shared/types';
import { taskService } from '@/services/taskService';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export default function TasksPage() {
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTaskCreate = async (
    taskData: Omit<
      Task,
      'id' | 'created_at' | 'updated_at' | 'status' | 'dependencies'
    >
  ) => {
    setIsCreatingTask(true);
    try {
      logger.debug('TasksPage: handleTaskCreate called with:', taskData);
      await taskService.createTask({
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.due_date,
        priority: taskData.priority,
        project_id: taskData.project_id,
        plannedDurationMinutes: taskData.planned_duration_minutes,
        actualDurationMinutes: taskData.actual_duration_minutes,
      });
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      logger.error('Failed to create task:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to create task';
      toast.error(message);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleTaskUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <ProtectedRoute>
      <div className="flex-1 p-3 md:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">
              Task Manager
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Organize your tasks and boost your productivity
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-xl md:text-2xl font-semibold">Your Tasks</h2>
              <TaskCreateForm
                onTaskCreate={handleTaskCreate}
                isLoading={isCreatingTask}
              />
            </div>
            <TaskList
              refreshTrigger={refreshTrigger}
              onTaskUpdate={handleTaskUpdate}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
