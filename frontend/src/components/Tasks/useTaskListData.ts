'use client';

import { useMemo } from 'react';
import type { CalendarEventUnion, Project, Task } from '@shared/types';
import { calendarService } from '@/services/calendarService';
import { projectService } from '@/services/projectService';
import { taskService } from '@/services/taskService';
import { useAsyncData } from '@/hooks/useAsyncData';

export type TaskListData = {
  tasks: Task[];
  projects: Project[];
  calendarEvents: CalendarEventUnion[];
};

export function useTaskListData(refreshTrigger?: number) {
  const loader = useMemo(
    () => async (): Promise<TaskListData> => {
      const [tasks, projects, calendarEvents] = await Promise.all([
        taskService.getAllTasks(),
        projectService.getAllProjects(),
        calendarService.getAllCalendarEvents(),
      ]);
      return { tasks, projects, calendarEvents };
    },
    [refreshTrigger]
  );

  return useAsyncData(loader, [loader]);
}






