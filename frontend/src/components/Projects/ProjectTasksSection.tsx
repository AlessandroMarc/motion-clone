'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Calendar, AlertCircle, X } from 'lucide-react';
import { getPriorityColor } from '@/utils/statusUtils';
import { formatDate, isOverdue } from '@/utils/dateUtils';
import { taskService } from '@/services/taskService';

import type { Task } from '@/../../../shared/types';
import { ProjectTaskCreateDialog } from './ProjectTaskCreateDialog';

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
}

export function ProjectTasksSection({
  projectId,
  tasks,
  onTaskCreate,
  onTaskUnlink,
}: ProjectTasksSectionProps) {
  const handleStatusToggle = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await taskService.updateTask(taskId, {
        status: newStatus as 'pending' | 'in-progress' | 'completed',
      });
      // Note: We don't update local state here since the parent will refetch
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

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

  return (
    <Card className="p-4">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">Project Tasks</CardTitle>
          <ProjectTaskCreateDialog
            projectId={projectId}
            onTaskCreate={handleTaskCreate}
          />
        </div>
      </CardHeader>
      <CardContent className="">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No tasks linked to this project yet.
            </p>
            <ProjectTaskCreateDialog
              projectId={projectId}
              onTaskCreate={handleTaskCreate}
              triggerText="Create First Task"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors group"
              >
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() =>
                    handleStatusToggle(task.id, task.status)
                  }
                  className="flex-shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <h4
                    className={`text-sm font-medium ${
                      task.status === 'completed'
                        ? 'line-through text-muted-foreground'
                        : ''
                    }`}
                  >
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className={`h-2 w-2 rounded-full ${getPriorityColor(task.priority)}`}
                  />
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    {task.priority}
                  </Badge>

                  {task.due_date && (
                    <div
                      className={`flex items-center gap-1 text-xs ${
                        isOverdue(task.due_date) && task.status !== 'completed'
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(task.due_date)}</span>
                      {isOverdue(task.due_date) &&
                        task.status !== 'completed' && (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        )}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleUnlinkTask(task.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
