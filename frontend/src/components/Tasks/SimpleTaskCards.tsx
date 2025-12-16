'use client';

import { useEffect, useState } from 'react';
import type { Task, Project } from '@shared/types';
import { taskService } from '@/services/taskService';
import { projectService } from '@/services/projectService';
import { Card, CardContent } from '@/components/ui/card';

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
      <div className="space-y-2">
        <div className="h-5 w-40 bg-muted animate-pulse rounded" />
        <div className="h-20 w-full bg-muted animate-pulse rounded" />
        <div className="h-20 w-full bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  if (tasks.length === 0) {
    return <div className="text-sm text-muted-foreground">No tasks</div>;
  }

  return (
    <div className="space-y-3">
      {tasks.map(task => {
        const project = task.project_id ? projectsById[task.project_id] : undefined;
        return (
          <Card key={task.id} className="border">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{task.title}</div>
                  {task.description ? (
                    <div className="text-xs text-muted-foreground truncate">
                      {task.description}
                    </div>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5">
                      {task.status}
                    </span>
                    {project ? (
                      <span className="truncate">Project: {project.name}</span>
                    ) : null}
                    {task.due_date ? (
                      <span>
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default SimpleTaskCards;








