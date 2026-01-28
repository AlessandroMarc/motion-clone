'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, AlertCircle, X, CheckCircle2, Clock } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';
import {
  isTaskCompleted,
  isTaskOverdue,
  TASK_COMPLETED_CLASS,
  TASK_COMPLETED_OPACITY_CLASS,
} from '@/utils/taskUtils';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/components/Tasks/taskCardConfig';
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
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Project Tasks</CardTitle>
          <ProjectTaskCreateDialog
            projectId={projectId}
            onTaskCreate={handleTaskCreate}
          />
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
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
          <div className="space-y-2">
            {tasks.map((task) => {
              const isCompleted = isTaskCompleted(task);
              const taskIsOverdue = isTaskOverdue(task);
              const statusConfig =
                STATUS_CONFIG[task.status] ?? STATUS_CONFIG['not-started'];
              const priorityConfig =
                PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG['medium'];
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={task.id}
                  className={cn(
                    'group flex items-start gap-3 p-3 rounded-lg border transition-all',
                    'hover:bg-accent/30 hover:border-accent',
                    isCompleted && TASK_COMPLETED_OPACITY_CLASS
                  )}
                >
                  {/* Status Icon */}
                  <div className={cn('mt-0.5', statusConfig.className)}>
                    <StatusIcon
                      className={cn(
                        'h-4 w-4',
                        task.status === 'in-progress' && 'animate-spin'
                      )}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4
                      className={cn(
                        'text-sm font-medium',
                        isCompleted && TASK_COMPLETED_CLASS
                      )}
                    >
                      {task.title}
                    </h4>

                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {task.description}
                      </p>
                    )}

                    {/* Metadata Row */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {/* Priority */}
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium',
                          priorityConfig.bgClass
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', priorityConfig.dotClass)} />
                        {priorityConfig.label}
                      </span>

                      {/* Duration */}
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

                      {/* Due Date */}
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

                  {/* Unlink Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => handleUnlinkTask(task.id)}
                    title="Unlink from project"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
