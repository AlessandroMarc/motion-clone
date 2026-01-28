'use client';

import { useMemo } from 'react';
import type { TaskListData } from '@/types';
import { calendarService } from '@/services/calendarService';
import { projectService } from '@/services/projectService';
import { taskService } from '@/services/taskService';
import { useAsyncData } from '@/hooks/useAsyncData';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshTrigger]
  );

  return useAsyncData(loader, [loader]);
}
