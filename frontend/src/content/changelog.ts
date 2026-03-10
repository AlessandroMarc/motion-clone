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
    version: '1.8.0',
    date: 'March 2026',
    title: 'Task Completion Management',
    description:
      'Complete and reopen tasks with visual celebrations and improved workflow.',
    items: [
      {
        type: 'new',
        text: 'Celebratory confetti animation plays when you complete a task — because achievements deserve recognition.',
      },
      {
        type: 'new',
        text: 'Reopen completed tasks directly from the task editor with a single click.',
      },
      {
        type: 'improved',
        text: 'Task completion actions are now more discoverable and prominent in the edit dialog.',
      },
      {
        type: 'improved',
        text: 'Auto-scheduler intelligently handles completed task events, clearing them from your calendar.',
      },
    ],
  },
  {
    version: '1.7.0',
    date: 'March 2026',
    title: 'Intelligent Duration Input',
    description:
      'A smarter way to enter task durations with flexible parsing and preset options.',
    items: [
      {
        type: 'new',
        text: 'Duration input component with intelligent parsing — enter "1.5" as either minutes or hours and get both suggestions.',
      },
      {
        type: 'new',
        text: 'Common preset durations (15 min, 30 min, 1 hr, etc.) available at a glance.',
      },
      {
        type: 'new',
        text: 'Support for decimal inputs without a leading zero (e.g., ".5" for 30 minutes).',
      },
      {
        type: 'new',
        text: 'Ability to clear task duration by selecting 0 minutes when editing actual duration.',
      },
      {
        type: 'improved',
        text: 'Enhanced accessibility with proper ARIA attributes for error messaging.',
      },
      {
        type: 'fixed',
        text: 'Fixed timezone issue where date-only strings were incorrectly parsed as UTC, causing deadline dates to shift.',
      },
      {
        type: 'fixed',
        text: 'Fixed label formatting that could produce invalid outputs like "1 hr 60 min" due to rounding carry.',
      },
    ],
  },
  {
    version: '1.6.0',
    date: 'March 2026',
    title: 'Support for Start Date',
    description:
      'The auto-scheduler can now take into account a task\'s "start date" to ensure it only schedules tasks on or after that date.',
    items: [],
  },
  {
    version: '1.6.0',
    date: 'March 2026',
    title: 'Support for setting a different schedule each day of the week',
    description:
      'The auto-scheduler can now plan tasks on a day-by-day basis, respecting your configured working hours and skipping non-working days.',
    items: [
      {
        type: 'new',
        text: 'Day-by-day scheduling: the scheduler now fills each day according to its specific working hours and availability.',
      },
      {
        type: 'new',
        text: 'Non-working days are automatically skipped during scheduling, so your calendar only shows realistic time blocks.',
      },
    ],
  },
  {
    version: '1.5.0',
    date: 'March 2026',
    title: 'Recurring Tasks',
    description:
      'Set up daily, weekly, or monthly recurring tasks and watch the auto-scheduler handle them intelligently.',
    items: [
      {
        type: 'new',
        text: 'Recurring tasks: create tasks that repeat daily, weekly, or monthly with customizable intervals.',
      },
      {
        type: 'new',
        text: 'Choose a start date to control which day of the week or month your tasks repeat on.',
      },
      {
        type: 'new',
        text: 'Recurring tasks appear in blue on the calendar to distinguish them from one-time tasks.',
      },
      {
        type: 'improved',
        text: 'Auto-scheduler now plans recurring tasks up to 90 days ahead automatically.',
      },
      {
        type: 'improved',
        text: 'Task creation form adapts when recurring mode is enabled for a streamlined experience.',
      },
      {
        type: 'fixed',
        text: 'Fixed an issue where rapidly clicking the schedule button could create duplicate events.',
      },
      {
        type: 'fixed',
        text: 'Deleting a task now properly removes all its calendar events.',
      },
    ],
  },
  {
    version: '1.4.0',
    date: 'March 2026',
    title: 'Multiple Schedules',
    description:
      'Assign tasks to dedicated schedules and let the auto-scheduler respect per-task working hours.',
    items: [
      {
        type: 'new',
        text: 'Schedule selector in the task form — assign any task to a specific schedule at creation or edit time.',
      },
      {
        type: 'improved',
        text: "Auto-scheduling now respects each task's individual schedule and working hours.",
      },
      {
        type: 'improved',
        text: 'Deleting a schedule automatically reassigns its tasks to a fallback schedule.',
      },
      {
        type: 'improved',
        text: 'Error messages are now clearer when the system is busy, showing exactly how long to wait.',
      },
    ],
  },
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
        text: 'Fixed timezone issue that caused scheduled tasks to appear at the wrong time for some users.',
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
        text: 'Fixed an issue where clicking schedule multiple times could create duplicate events.',
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
        text: 'Authentication: sign up and log in with email and password.',
      },
      {
        type: 'new',
        text: 'Dark mode support with system preference detection.',
      },
    ],
  },
];
