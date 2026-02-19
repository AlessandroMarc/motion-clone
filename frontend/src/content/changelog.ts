export type ChangeType = 'new' | 'improved' | 'fixed';

export interface ChangeItem {
  type: ChangeType;
  text: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description?: string;
  items: ChangeItem[];
}

export const changelogEntries: ChangelogEntry[] = [
  {
    version: '1.3.0',
    date: 'February 2026',
    title: 'Drag-to-Reschedule & Calendar Polish',
    description:
      'Smoother calendar interactions and a rescheduling workflow that actually gets out of your way.',
    items: [
      {
        type: 'new',
        text: 'Drag tasks directly on the calendar to reschedule them — the rest of the day adjusts automatically.',
      },
      {
        type: 'new',
        text: 'Conflict indicator highlights time blocks that overlap with existing Google Calendar events.',
      },
      {
        type: 'improved',
        text: 'Calendar week view now shows a color-coded workload bar so you can spot overloaded days at a glance.',
      },
      {
        type: 'improved',
        text: 'Auto-schedule now respects your configured working hours and skips weekends by default.',
      },
      {
        type: 'fixed',
        text: 'Fixed an edge case where tasks scheduled past midnight would appear on the wrong day.',
      },
      {
        type: 'fixed',
        text: 'Resolved a layout shift when the sidebar collapsed on narrow screens.',
      },
    ],
  },
  {
    version: '1.2.0',
    date: 'January 2026',
    title: 'Google Calendar Sync',
    description:
      'Your Nexto tasks and your Google Calendar now speak the same language.',
    items: [
      {
        type: 'new',
        text: 'Connect your Google Calendar from Profile settings — meetings and busy blocks are imported automatically.',
      },
      {
        type: 'new',
        text: 'Two-way sync: changes to Nexto-created events in Google Calendar reflect back in the app.',
      },
      {
        type: 'new',
        text: 'Onboarding checklist now includes a "Sync Google Calendar" step to guide new users.',
      },
      {
        type: 'improved',
        text: 'Scheduler skips time slots occupied by imported Google Calendar events when placing tasks.',
      },
      {
        type: 'fixed',
        text: 'Fixed timezone offset issue that caused scheduled tasks to appear one hour early for users in UTC+1.',
      },
    ],
  },
  {
    version: '1.1.0',
    date: 'December 2025',
    title: 'Projects & Priority Scheduling',
    description:
      'Group your work into projects and let priority determine where each task lands.',
    items: [
      {
        type: 'new',
        text: 'Projects: create named projects, assign tasks to them, and track completion progress.',
      },
      {
        type: 'new',
        text: 'Priority levels (Urgent, High, Normal, Low) now influence slot selection during auto-scheduling.',
      },
      {
        type: 'new',
        text: 'Sidebar navigation added with quick links to Calendar, Tasks, Projects, and Profile.',
      },
      {
        type: 'improved',
        text: 'Task creation form is more compact — deadline and estimate on the same row.',
      },
      {
        type: 'improved',
        text: 'Empty-state illustrations added to Projects and Tasks pages to guide first-time users.',
      },
      {
        type: 'fixed',
        text: 'Auto-schedule no longer creates duplicate calendar blocks when triggered multiple times rapidly.',
      },
    ],
  },
  {
    version: '1.0.0',
    date: 'November 2025',
    title: 'Initial Launch 🚀',
    description:
      'Nexto is live. Add tasks, set deadlines, and let the scheduler do the planning for you.',
    items: [
      {
        type: 'new',
        text: 'Task management: create, edit, and delete tasks with title, deadline, time estimate, and priority.',
      },
      {
        type: 'new',
        text: 'Auto-schedule: one click fills your calendar with time blocks based on deadlines and priority.',
      },
      {
        type: 'new',
        text: 'Calendar view: see your scheduled tasks alongside a week-based calendar layout.',
      },
      {
        type: 'new',
        text: 'Authentication: sign up and log in with email/password via Supabase.',
      },
      {
        type: 'new',
        text: 'Dark mode support with system preference detection.',
      },
    ],
  },
];
