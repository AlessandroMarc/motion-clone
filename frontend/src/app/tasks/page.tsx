'use client';

import { useState } from 'react';
import { TaskCreateForm, TaskList } from '@/components/Tasks';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import type { Task } from '@/types';
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
      logger.error('Failed to create task', { error });
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
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header - constrained width */}
        <div className="px-3 md:px-6 pt-3 md:pt-6">
          <div className="max-w-4xl">
            <div className="mb-4 md:mb-6">
              <h1 className="text-2xl md:text-3xl font-title text-foreground mb-1">
                Task Manager
              </h1>
              <p className="text-sm font-body text-muted-foreground">
                Organize your tasks and boost your productivity
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-lg md:text-xl font-subheading">Your Tasks</h2>
              <TaskCreateForm
                onTaskCreate={handleTaskCreate}
                isLoading={isCreatingTask}
              />
            </div>
          </div>
        </div>

        {/* Kanban Board - full width */}
        <div className="flex-1 min-h-0 px-3 md:px-6 pb-3 md:pb-6">
          <TaskList
            refreshTrigger={refreshTrigger}
            onTaskUpdate={handleTaskUpdate}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
