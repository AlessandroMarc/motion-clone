import {
  Task,
  CalendarEventTask,
  CalendarEventUnion,
  isCalendarEventTask,
} from '@/types';

export interface ProjectSchedulingStatus {
  allTasksScheduled: boolean;
  hasDeadlineViolations: boolean;
  incompleteTasksCount: number;
  scheduledTasksCount: number;
  totalTasksCount: number;
}

/**
 * Check if all tasks in a project are scheduled within their deadlines
 * @param projectTasks - All tasks belonging to the project
 * @param allCalendarEvents - All calendar events (to find task events)
 * @returns Status object indicating scheduling state
 */
export function checkProjectSchedulingStatus(
  projectTasks: Task[],
  allCalendarEvents: CalendarEventUnion[]
): ProjectSchedulingStatus {
  // Filter only task events
  const taskEvents = allCalendarEvents.filter(
    (event): event is CalendarEventTask =>
      isCalendarEventTask(event) && event.linked_task_id !== undefined
  );

  // Group events by task ID
  const eventsByTaskId = new Map<string, CalendarEventTask[]>();
  taskEvents.forEach(event => {
    const taskId = event.linked_task_id;
    if (!eventsByTaskId.has(taskId)) {
      eventsByTaskId.set(taskId, []);
    }
    eventsByTaskId.get(taskId)!.push(event);
  });

  // Filter incomplete tasks (not completed)
  const incompleteTasks = projectTasks.filter(
    task => task.status !== 'completed'
  );

  let scheduledTasksCount = 0;
  let hasDeadlineViolations = false;

  // Check each incomplete task
  for (const task of incompleteTasks) {
    const taskEvents = eventsByTaskId.get(task.id) || [];

    // Calculate total scheduled duration from non-completed events
    const scheduledDuration = taskEvents
      .filter(event => !event.completed_at) // Only count non-completed events
      .reduce((total, event) => {
        const duration =
          (event.end_time.getTime() - event.start_time.getTime()) / (1000 * 60);
        return total + duration;
      }, 0);

    // Check if task has enough scheduled time
    const remainingDuration =
      task.planned_duration_minutes - (task.actual_duration_minutes || 0);
    const isFullyScheduled = scheduledDuration >= remainingDuration;

    if (isFullyScheduled) {
      scheduledTasksCount++;
    }

    // Check for deadline violations
    if (task.due_date) {
      const deadline = new Date(task.due_date);
      deadline.setHours(23, 59, 59, 999);

      // Check if any scheduled event (non-completed) is after the deadline
      const hasViolation = taskEvents
        .filter(event => !event.completed_at)
        .some(event => event.start_time > deadline);

      if (hasViolation) {
        hasDeadlineViolations = true;
      }
    }
  }

  const allTasksScheduled =
    incompleteTasks.length > 0 &&
    scheduledTasksCount === incompleteTasks.length &&
    !hasDeadlineViolations;

  return {
    allTasksScheduled,
    hasDeadlineViolations,
    incompleteTasksCount: incompleteTasks.length,
    scheduledTasksCount,
    totalTasksCount: projectTasks.length,
  };
}
