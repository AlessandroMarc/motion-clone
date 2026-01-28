'use client';

import { useEffect, useState } from 'react';
import type { Task, Project } from '@/types';
import { taskService } from '@/services/taskService';
import { projectService } from '@/services/projectService';
import { Card } from '@/components/ui/card';
import { Calendar, Folder, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  isTaskCompleted,
  isTaskOverdue,
  TASK_COMPLETED_CLASS,
  TASK_COMPLETED_OPACITY_CLASS,
} from '@/utils/taskUtils';
import { formatDate } from '@/utils/dateUtils';
import { STATUS_CONFIG, PRIORITY_CONFIG } from './taskCardConfig';

export function SimpleTaskCards() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectsById, setProjectsById] = useState<Record<string, Project>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [fetchedTasks, fetchedProjects] = await Promise.all([
          taskService.getAllTasks(),
          projectService.getAllProjects(),
        ]);
        setTasks(fetchedTasks);
        const map: Record<string, Project> = {};
        for (const p of fetchedProjects) map[p.id] = p as Project;
        setProjectsById(map);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 w-full bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive p-4 bg-destructive/10 rounded-lg">
        {error}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-6 text-center bg-muted/30 rounded-lg">
        No tasks yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const project = task.project_id ? projectsById[task.project_id] : undefined;
        const isCompleted = isTaskCompleted(task);
        const taskIsOverdue = isTaskOverdue(task);
        const statusConfig =
          STATUS_CONFIG[task.status] ?? STATUS_CONFIG['not-started'];
        const priorityConfig =
          PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG['medium'];
        const StatusIcon = statusConfig.icon;

        return (
          <Card
            key={task.id}
            className={cn(
              'border-l-[3px] transition-all hover:shadow-sm',
              priorityConfig.borderClass,
              isCompleted && TASK_COMPLETED_OPACITY_CLASS
            )}
          >
            <div className="p-3">
              <div className="flex items-start gap-3">
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
                  <div
                    className={cn(
                      'font-medium truncate',
                      isCompleted && TASK_COMPLETED_CLASS
                    )}
                  >
                    {task.title}
                  </div>

                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {task.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {/* Priority Dot */}
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span className={cn('h-1.5 w-1.5 rounded-full', priorityConfig.dotClass)} />
                      {priorityConfig.label}
                    </span>

                    {/* Project */}
                    {project && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Folder className="h-3 w-3" />
                        {project.name}
                      </span>
                    )}

                    {/* Due Date */}
                    {task.due_date && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1',
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
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default SimpleTaskCards;
