/**
 * TypeScript types for the Motion API (https://api.usemotion.com/v1).
 * Based on real API response data.
 */

export interface MotionUser {
  id: string;
  name: string;
  email: string;
  type?: string;
  picture?: string;
  createdTime?: string;
  updatedTime?: string;
  isPlaceholder?: boolean;
  onboardingComplete?: boolean;
  mainCalendarEmail?: string;
  lastActive?: string;
  hasActiveSubscription?: boolean;
  apiDisabled?: boolean;
  deletedTime?: string | null;
  noExternalCalendarsModeEnabled?: boolean;
}

export type MotionWorkspaceType = 'INDIVIDUAL' | 'TEAM';

export interface MotionWorkspace {
  id: string;
  name: string;
  teamId: string | null;
  type?: MotionWorkspaceType;
  statuses?: MotionStatus[];
  labels?: MotionLabel[];
  members?: MotionUser[];
}

export interface MotionStatus {
  id?: string;
  name: string;
  isDefaultStatus: boolean;
  isResolvedStatus: boolean;
  color?: string;
  sortPosition?: string;
  isSystemStatus?: boolean;
  autoScheduleEnabled?: boolean;
  createdTime?: string;
  updatedTime?: string;
  workspaceId?: string;
  deletedTime?: string | null;
  type?: string;
  autoScheduleSetting?: string;
}

export interface MotionLabel {
  name: string;
}

export interface MotionScheduleSlot {
  start: string; // e.g. "09:00"
  end: string;   // e.g. "17:00"
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

export type MotionProjectType = 'NORMAL' | string;
export type MotionPriorityLevel = 'ASAP' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface MotionProject {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  status?: MotionStatus;
  statusId?: string;
  type?: MotionProjectType;
  priorityLevel?: MotionPriorityLevel;
  managerId?: string;
  createdByUserId?: string;
  manager?: MotionUser;
  dueDate?: string | null;
  startDate?: string | null;
  createdTime?: string;
  updatedTime?: string;
  completedTime?: string | null;
  color?: string;
  rank?: string | null;
  createdWithAi?: boolean;
  projectDefinitionId?: string | null;
  activeStageDefinitionId?: string | null;
  reconciliationRequestedAt?: string | null;
  reconciliationCompletedAt?: string | null;
  reconciliationStatus?: string | null;
  scheduledStatus?: string | null;
  estimatedCompletionTime?: string | null;
  duration?: number;
  completedDuration?: number;
  canceledDuration?: number;
  taskCount?: number;
  completedTaskCount?: number;
  canceledTaskCount?: number;
  labels?: MotionLabel[];
  variableInstances?: unknown[];
  customFieldValues?: Record<string, MotionCustomFieldValue>;
}

/** Motion task priority values */
export type MotionPriority = 'ASAP' | 'HIGH' | 'MEDIUM' | 'LOW';

/** Motion task deadline type values */
export type MotionDeadlineType = 'HARD' | 'SOFT' | 'NONE';

export interface MotionChunk {
  id: string;
  duration: number;
  scheduledStart: string;
  scheduledEnd: string;
  completedTime: string | null;
  isFixed: boolean;
}

export interface MotionTask {
  id: string;
  name: string;
  description: string;
  duration?: number | 'NONE' | 'REMINDER';
  dueDate?: string | null;
  deadlineType: MotionDeadlineType;
  parentRecurringTaskId: string | null;
  completed: boolean;
  completedTime: string | null;
  updatedTime?: string;
  startOn?: string | null;
  creator: MotionUser;
  project: Pick<MotionProject, 'id' | 'name' | 'workspaceId'> | null;
  workspace: MotionWorkspace;
  status: MotionStatus;
  priority: MotionPriority;
  labels: MotionLabel[];
  assignees: MotionUser[];
  scheduledStart: string | null;
  createdTime: string;
  scheduledEnd: string | null;
  schedulingIssue: boolean;
  lastInteractedTime?: string;
  customFieldValues?: Record<string, MotionCustomFieldValue>;
  chunks: MotionChunk[];
}

export interface MotionRecurringTask {
  id: string;
  name: string;
  description?: string;
  creator: MotionUser;
  assignee: MotionUser;
  project?: Pick<MotionProject, 'id' | 'name' | 'workspaceId'> | null;
  status: MotionStatus;
  priority: MotionPriority;
  labels: MotionLabel[];
  workspace: MotionWorkspace;
  frequency?: string;
  duration?: number | 'NONE' | 'REMINDER';
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
