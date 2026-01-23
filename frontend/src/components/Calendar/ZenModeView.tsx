'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Task, CalendarEventUnion } from '@shared/types';
import { isCalendarEventTask } from '@shared/types';
import { taskService } from '@/services/taskService';
import { calendarService } from '@/services/calendarService';
import { isSameDay } from '@/utils/calendarUtils';
import { format } from 'date-fns';

interface ZenModeViewProps {
  onExit: () => void;
}

export function ZenModeView({ onExit }: ZenModeViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEventUnion[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch today's tasks and events
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [allTasks, allEvents] = await Promise.all([
          taskService.getAllTasks(),
          calendarService.getCalendarEventsByDateRange(
            today.toISOString(),
            new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()
          ),
        ]);
        setTasks(allTasks);
        setEvents(allEvents);
      } catch (error) {
        console.error('Failed to load zen mode data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [today]);

  // Get today's tasks (incomplete tasks that have events today or are not completed)
  const todayTasks = useMemo(() => {
    const todayEventTaskIds = new Set(
      events
        .filter(event => isCalendarEventTask(event) && isSameDay(event.start_time, today))
        .map(event => (event as { linked_task_id: string }).linked_task_id)
    );

    return tasks.filter(task => {
      // Include tasks that have events today
      if (todayEventTaskIds.has(task.id)) {
        return true;
      }
      // Include incomplete tasks
      return task.status !== 'completed' && 
             (task.actual_duration_minutes ?? 0) < (task.planned_duration_minutes ?? 0);
    });
  }, [tasks, events, today]);

  const formattedDate = format(today, 'EEEE, MMMM d, yyyy');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground font-body">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Exit button - subtle */}
      <button
        onClick={onExit}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors font-body text-sm"
        aria-label="Exit zen mode"
      >
        Exit
      </button>

      {/* Title with today's date */}
      <h1 className="text-4xl md:text-5xl font-title text-foreground mb-12 text-center">
        {formattedDate}
      </h1>

      {/* Today's tasks as bullet points */}
      <div className="w-full max-w-2xl">
        {todayTasks.length === 0 ? (
          <p className="text-center text-muted-foreground font-body text-lg">
            No tasks for today
          </p>
        ) : (
          <ul className="space-y-4">
            {todayTasks.map(task => (
              <li
                key={task.id}
                className="text-lg md:text-xl font-body text-foreground flex items-start gap-3"
              >
                <span className="text-primary mt-1.5">•</span>
                <span className="flex-1">{task.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
