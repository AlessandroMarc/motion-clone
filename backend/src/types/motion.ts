/**
 * TypeScript types for the Motion API (https://api.usemotion.com/v1).
 * Based on MIGRATION_DOCS.md.
 */

export interface MotionUser {
  id: string;
  name?: string;
  email: string;
}

export interface MotionWorkspace {
  id: string;
  name: string;
  teamId?: string;
  statuses?: MotionStatus[];
  labels?: MotionLabel[];
  members?: MotionUser[];
}

export interface MotionStatus {
  name: string;
  isDefaultStatus: boolean;
  isResolvedStatus: boolean;
}

export interface MotionLabel {
  name: string;
}

export interface MotionScheduleSlot {
  start: string; // e.g. "09:00"
  end: string; // e.g. "17:00"
}

export interface MotionSchedule {
  name: string;
  isDefaultTimezone: boolean;
  timezone: string;
  schedule: {
    monday?: MotionScheduleSlot[];
    tuesday?: MotionScheduleSlot[];
    wednesday?: MotionScheduleSlot[];
    thursday?: MotionScheduleSlot[];
    friday?: MotionScheduleSlot[];
    saturday?: MotionScheduleSlot[];
    sunday?: MotionScheduleSlot[];
  };
}

export interface MotionProject {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  status?: MotionStatus;
  createdTime?: string;
  updatedTime?: string;
  customFieldValues?: Record<string, MotionCustomFieldValue>;
}

/** Motion task priority values */
export type MotionPriority = 'ASAP' | 'HIGH' | 'MEDIUM' | 'LOW';

/** Motion task deadline type values */
export type MotionDeadlineType = 'HARD' | 'SOFT' | 'NONE';

export interface MotionTask {
  id: string;
  name: string;
  description: string;
  duration?: number | 'NONE' | 'REMINDER';
  dueDate?: string;
  deadlineType: MotionDeadlineType;
  parentRecurringTaskId?: string;
  completed: boolean;
  completedTime?: string;
  updatedTime?: string;
  startOn?: string;
  creator: MotionUser;
  project?: Pick<MotionProject, 'id' | 'name' | 'workspaceId'>;
  workspace: Pick<MotionWorkspace, 'id' | 'name'>;
  status: MotionStatus;
  priority: MotionPriority;
  labels: MotionLabel[];
  assignees: MotionUser[];
  scheduledStart?: string;
  createdTime: string;
  scheduledEnd?: string;
  schedulingIssue: boolean;
  lastInteractedTime?: string;
  customFieldValues?: Record<string, MotionCustomFieldValue>;
  chunks?: MotionChunk[];
}

export interface MotionRecurringTask {
  id: string;
  name: string;
  creator: MotionUser;
  assignee: MotionUser;
  project?: Pick<MotionProject, 'id' | 'name' | 'workspaceId'>;
  status: MotionStatus;
  priority: MotionPriority;
  labels: MotionLabel[];
  workspace: Pick<MotionWorkspace, 'id' | 'name'>;
  frequency?: string;
  duration?: number | 'NONE' | 'REMINDER';
}

export interface MotionChunk {
  scheduledStart: string;
  scheduledEnd: string;
}

export type MotionCustomFieldValue =
  | { type: 'text'; value: string | null }
  | { type: 'number'; value: number | null }
  | { type: 'url'; value: string | null }
  | { type: 'date'; value: string | null }
  | { type: 'select'; value: string | null }
  | { type: 'multiSelect'; value: string[] | null }
  | { type: 'person'; value: MotionUser | null }
  | { type: 'multiPerson'; value: MotionUser[] | null }
  | { type: 'email'; value: string | null }
  | { type: 'phone'; value: string | null }
  | { type: 'checkbox'; value: boolean | null }
  | { type: 'relatedTo'; value: string | null };

/** Paginated response wrapper used by Motion list endpoints */
export interface MotionPaginatedResponse<T> {
  meta: {
    nextCursor?: string;
    pageSize: number;
  };
  tasks?: T[];
  projects?: T[];
  workspaces?: T[];
}
