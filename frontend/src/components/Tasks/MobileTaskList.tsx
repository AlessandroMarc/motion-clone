'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Inbox, ChevronDown, Plus } from 'lucide-react';
import Link from 'next/link';
import type { Task, Project } from '@/types';
import { cn } from '@/lib/utils';
import {
  groupTasksByProject,
  isTaskCompleted,
  TASK_COMPLETED_CLASS,
} from '@/utils/taskUtils';
import { PriorityDot, ScheduleBadge, DueDateDisplay } from './listComponents';
import { calendarService } from '@/services/calendarService';
import { TaskCompletionDot } from './TaskCompletionDot';
import { TaskCreateDialogForm } from './forms/TaskCreateDialogForm';
import { listItem, staggerContainer } from '@/lib/animations';

// ============================================================================
// Mobile Row
// ============================================================================

interface MobileTaskListRowProps {
  task: Task;
  onSelect: (task: Task) => void;
  onToggleTaskCompletion: (task: Task, nextCompleted: boolean) => Promise<void>;
  nextSessionDate?: Date | null;
}

function MobileTaskListRow({
  task,
  onSelect,
  onToggleTaskCompletion,
  nextSessionDate,
}: MobileTaskListRowProps): React.ReactElement {
  const isCompleted = isTaskCompleted(task);
  const [isPreviewingComplete, setIsPreviewingComplete] = useState(false);

  return (
    <div
      className={cn(
        'flex items-center gap-3 w-full text-left py-2.5 px-3 rounded-lg',
        'hover:bg-muted/50 active:bg-muted transition-colors',
        'border-b border-border/50 last:border-b-0'
      )}
    >
      <PriorityDot priority={task.priority} />
      <TaskCompletionDot
        completed={isCompleted}
        onToggle={nextCompleted => onToggleTaskCompletion(task, nextCompleted)}
        onPreviewChange={setIsPreviewingComplete}
      />
      <button
        type="button"
        onClick={() => onSelect(task)}
        className={cn(
          'flex-1 min-w-0 font-medium text-sm truncate text-left',
          (isCompleted || isPreviewingComplete) && TASK_COMPLETED_CLASS
        )}
      >
        <div>{task.title}</div>
        <div className="text-xs text-muted-foreground">
          <DueDateDisplay
            task={task}
            nextSessionDate={nextSessionDate}
            startDate={task.start_date ?? null}
          />
        </div>
      </button>
    </div>
  );
}

// ============================================================================
// Desktop Row
// ============================================================================

interface DesktopTaskListRowProps {
  task: Task;
  onSelect: (task: Task) => void;
  onToggleTaskCompletion: (task: Task, nextCompleted: boolean) => Promise<void>;
  nextSessionDate?: Date | null;
}

function DesktopTaskListRow({
  task,
  onSelect,
  onToggleTaskCompletion,
  nextSessionDate,
}: DesktopTaskListRowProps): React.ReactElement {
  const isCompleted = isTaskCompleted(task);
  const [isPreviewingComplete, setIsPreviewingComplete] = useState(false);

  return (
    <div
      className={cn(
        'flex items-center gap-4 w-full text-left py-3 px-4 rounded-lg',
        'hover:bg-muted/50 active:bg-muted transition-colors',
        'border-b border-border/50 last:border-b-0'
      )}
    >
      {/* Priority Dot */}
      <PriorityDot priority={task.priority} />

      <TaskCompletionDot
        completed={isCompleted}
        onToggle={nextCompleted => onToggleTaskCompletion(task, nextCompleted)}
        onPreviewChange={setIsPreviewingComplete}
      />

      {/* Title */}
      <button
        type="button"
        onClick={() => onSelect(task)}
        className={cn(
          'flex-grow max-w-xs font-medium text-sm truncate text-left',
          (isCompleted || isPreviewingComplete) && TASK_COMPLETED_CLASS
        )}
      >
        {task.title}
      </button>

      {/* Due Date */}
      <div className="w-48 text-muted-foreground">
        <DueDateDisplay
          task={task}
          nextSessionDate={nextSessionDate}
          startDate={task.start_date ?? null}
        />
      </div>

      {/* Schedule */}
      <div className="w-28 flex justify-end">
        <ScheduleBadge task={task} />
      </div>
    </div>
  );
}

interface TaskGroup {
  id: string | null;
  label: string;
  projectId: string | null;
  tasks: Task[];
}

interface MobileTaskListProps {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (task: Task) => void;
  onToggleTaskCompletion: (task: Task, nextCompleted: boolean) => Promise<void>;
  onDeleteTask: (taskId: string) => void;
  onTaskCreate: (
    taskData: Omit<
      Task,
      'id' | 'created_at' | 'updated_at' | 'status' | 'dependencies'
    >
  ) => Promise<void>;
  isDesktop?: boolean;
}

export function MobileTaskList({
  tasks,
  projects,
  onSelectTask,
  onToggleTaskCompletion,
  onTaskCreate,
  isDesktop = false,
}: MobileTaskListProps): React.ReactElement {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );
  const [nextSessionByTask, setNextSessionByTask] = useState<
    Record<string, Date | null>
  >({});

  // Fetch the next scheduled session for each task (if any)
  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);

  React.useEffect(() => {
    if (taskIds.length === 0) {
      setNextSessionByTask({});
      return;
    }

    let cancelled = false;

    const loadSessions = async () => {
      try {
        const concurrency = 4;
        const entries: Array<readonly [string, Date | null]> = [];

        const idsCopy = [...taskIds];
        while (idsCopy.length > 0) {
          const batch = idsCopy.splice(0, concurrency);
          const batchResults = await Promise.all(
            batch.map(async taskId => {
              try {
                const events =
                  await calendarService.getCalendarEventsByTaskId(taskId);
                const future = events
                  .map(e => e.start_time)
                  .filter((d): d is Date => Boolean(d))
                  .filter(d => d.getTime() >= Date.now())
                  .sort((a, b) => a.getTime() - b.getTime());
                return [taskId, future[0] ?? null] as const;
              } catch {
                return [taskId, null] as const;
              }
            })
          );
          entries.push(...batchResults);
        }

        if (!cancelled) {
          setNextSessionByTask(Object.fromEntries(entries));
        }
      } catch {
        // ignore failures; just don’t show session date
        if (!cancelled) setNextSessionByTask({});
      }
    };

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [taskIds]);

  const groups = useMemo((): TaskGroup[] => {
    const { unassigned, byProject } = groupTasksByProject(tasks, projects);
    const result: TaskGroup[] = [];
    if (unassigned.length > 0) {
      result.push({
        id: null,
        label: 'Unassigned',
        projectId: null,
        tasks: unassigned,
      });
    }
    for (const { project, tasks: projectTasks } of byProject) {
      result.push({
        id: project.id,
        label: project.name,
        projectId: project.id,
        tasks: projectTasks,
      });
    }
    return result;
  }, [tasks, projects]);

  const toggleGroupCollapse = (groupId: string | null) => {
    const id = groupId ?? 'unassigned';
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const RowComponent = isDesktop ? DesktopTaskListRow : MobileTaskListRow;

  return (
    <div className="flex flex-col overflow-y-auto py-1 -mx-1 gap-4">
      {groups.map(group => {
        const groupId = group.id ?? 'unassigned';
        const isCollapsed = collapsedGroups.has(groupId);

        return (
          <section key={groupId}>
            <button
              type="button"
              onClick={() => toggleGroupCollapse(group.id)}
              className={cn(
                'flex items-center gap-2 px-3 mb-1.5 w-full text-left',
                'hover:opacity-80 transition-opacity'
              )}
            >
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground shrink-0 transition-transform',
                  isCollapsed && '-rotate-90'
                )}
              />
              <span className="text-muted-foreground shrink-0">
                {group.projectId ? (
                  <Folder className="h-3.5 w-3.5" />
                ) : (
                  <Inbox className="h-3.5 w-3.5" />
                )}
              </span>
              {group.projectId ? (
                <Link
                  href={`/projects/${group.projectId}`}
                  onClick={e => e.stopPropagation()}
                  className=" font-semibold text-foreground truncate hover:underline"
                >
                  {group.label}
                </Link>
              ) : (
                <span className=" font-semibold text-muted-foreground truncate">
                  {group.label}
                </span>
              )}
              <TaskCreateDialogForm
                onTaskCreate={onTaskCreate}
                initialProjectId={group.projectId}
                trigger={
                  <Plus
                    className="h-4 w-4 text-muted-foreground shrink-0"
                    onClick={e => e.stopPropagation()}
                  />
                }
              />
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 ml-auto">
                {group.tasks.length}
              </span>
            </button>

            {!isCollapsed && (
              <motion.div
                className="flex flex-col rounded-lg border border-border/50 overflow-hidden"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence mode="popLayout">
                  {group.tasks.map(task => (
                    <motion.div
                      key={task.id}
                      layout
                      variants={listItem}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <RowComponent
                        task={task}
                        onSelect={onSelectTask}
                        onToggleTaskCompletion={onToggleTaskCompletion}
                        nextSessionDate={nextSessionByTask[task.id] ?? null}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </section>
        );
      })}
    </div>
  );
}
