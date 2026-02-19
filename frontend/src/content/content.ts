// Landing Content Interfaces
export interface LandingNav {
  brand: string;
  cta: string;
  dashboard: string;
}

export interface LandingHero {
  headline: string;
  subheadline: string;
  primaryCta: string;
  secondaryCta: string;
}

export interface LandingSellingPoint {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface LandingSellingPoints {
  items: LandingSellingPoint[];
}

export interface LandingFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface LandingFeatures {
  sectionTitle: string;
  sectionSubtitle: string;
  items: LandingFeature[];
}

export interface LandingBenefit {
  id: string;
  metric: string;
  label: string;
}

export interface LandingBenefits {
  sectionTitle: string;
  items: LandingBenefit[];
}

export interface LandingHowItWorksStep {
  number: string;
  title: string;
  description: string;
}

export interface LandingHowItWorks {
  sectionTitle: string;
  sectionSubtitle: string;
  steps: LandingHowItWorksStep[];
}

export interface LandingFinalCta {
  headline: string;
  subheadline: string;
  primaryCta: string;
  note: string;
}

export interface LandingFooter {
  copyright: string;
  tagline: string;
}

export interface LandingContent {
  nav: LandingNav;
  hero: LandingHero;
  sellingPoints: LandingSellingPoints;
  features: LandingFeatures;
  benefits: LandingBenefits;
  howItWorks: LandingHowItWorks;
  finalCta: LandingFinalCta;
  footer: LandingFooter;
}

// Onboarding Content Interfaces
export interface OnboardingWelcome {
  title: string;
  description: string;
  cta: string;
}

export interface OnboardingStep {
  title: string;
  description: string;
}

export interface OnboardingSteps {
  createTask: OnboardingStep;
  createProject: OnboardingStep;
  schedule: OnboardingStep;
  syncCalendar: OnboardingStep;
}

export interface OnboardingChecklistStep {
  id: string;
  label: string;
}

export interface OnboardingChecklist {
  title: string;
  steps: OnboardingChecklistStep[];
}

export interface OnboardingContent {
  welcome: OnboardingWelcome;
  steps: OnboardingSteps;
  checklist: OnboardingChecklist;
}

export const landingContent: LandingContent = {
  nav: {
    brand: 'Nexto',
    cta: 'Start Free Trial',
    dashboard: 'Dashboard',
  },

  hero: {
    headline: 'Your Tasks. Auto-Scheduled. Zero Planning.',
    subheadline:
      'AI slots tasks into Google Calendar by deadline, priority, and meetings. Add tasks in seconds. Get a schedule that actually holds. No manual planning — just ship.',
    primaryCta: 'Try Free for 14 Days',
    secondaryCta: 'Subscribe',
  },

  sellingPoints: {
    items: [
      {
        id: 'zero-planning',
        title: 'Save Hours Every Week',
        description:
          'Add a task, set a deadline and estimate. Nexto fits it around your calendar and meetings. Seconds per task, hours back every week. No more “when will I do this?” — the calendar is already decided.',
        icon: 'Sparkles',
      },
      {
        id: 'adapts-to-you',
        title: 'Endless Lists and Decision Fatigue — Gone',
        description:
          'Too many tabs, too many “next actions,” too much context-switching. Nexto turns the list into one thing: the next block on your calendar. No triage paralysis. Open the app, do the block.',
        icon: 'RefreshCw',
      },
      {
        id: 'always-know',
        title: 'No More “I Forgot About That”',
        description:
          'Missed deadlines and last-minute scrambles happen when planning is manual. Nexto backfills from due dates and warns you in advance. Days of advance warning before overload hits. No surprises.',
        icon: 'Compass',
      },
      {
        id: 'smash-deadlines',
        title: 'Stacked for “No” to Feel Stupid',
        description:
          'Deadline-aware scheduling, priority-based slots, Google Calendar sync, drag-to-reschedule. One system: tasks, meetings, and focus time in one view. Built for full-stack devs and freelancers who hate planning.',
        icon: 'Rocket',
      },
    ],
  },

  features: {
    sectionTitle: 'Automatic Scheduling That Actually Works',
    sectionSubtitle:
      'Built by devs who were tired of doing the planning work ourselves.',
    items: [
      {
        id: 'smart-scheduling',
        title: 'Deadline-Aware Scheduling',
        description:
          'Schedules backward from due dates. Duration, priority, and availability in one pass. You never start too late — overload shows up days in advance.',
        icon: 'Brain',
      },
      {
        id: 'priority-aware',
        title: 'Priority-Based Placement',
        description:
          'High-priority work gets the best slots. The rest fills the gaps. Your energy goes where it matters.',
        icon: 'Target',
      },
      {
        id: 'calendar-sync',
        title: 'Google Calendar Sync',
        description:
          'Reads meetings and blocks. Schedules tasks around them. One source of truth — no double-entry, no collision.',
        icon: 'Calendar',
      },
      {
        id: 'flexible-reschedule',
        title: 'Drag to Reschedule',
        description:
          'Move a block; the rest adjusts. Or let the system reschedule when meetings move. Your plan stays realistic without you redrawing it.',
        icon: 'RefreshCw',
      },
    ],
  },

  benefits: {
    sectionTitle: 'What You Get Back',
    items: [
      {
        id: 'save-time',
        metric: 'Hours',
        label: 'saved per week — focus on shipping, not planning',
      },
      {
        id: 'focus',
        metric: 'Zero',
        label: '“what’s next?” — your calendar is the single queue',
      },
      {
        id: 'deadlines',
        metric: 'Days',
        label: 'of advance warning before overload hits',
      },
    ],
  },

  howItWorks: {
    sectionTitle: 'How It Works',
    sectionSubtitle: 'Three steps. One workable schedule. No ritual.',
    steps: [
      {
        number: '01',
        title: 'Add Your Tasks',
        description:
          'Title, deadline, estimate, priority. Seconds each. No forms, no friction.',
      },
      {
        number: '02',
        title: 'Connect Google Calendar',
        description:
          'One-time sync. Nexto uses meetings and blocks so tasks land in real open time.',
      },
      {
        number: '03',
        title: 'Open Calendar, Execute',
        description:
          'Every task is time-blocked. Follow the plan. Reschedule by drag when life changes — or let it auto-reshuffle.',
      },
    ],
  },
  finalCta: {
    headline: 'Focus Mode Unlocked',
    subheadline: 'Stop planning. Start doing. Try it free for 14 days.',
    primaryCta: 'Start Free Trial',
    note: 'No credit card • Cancel anytime',
  },

  footer: {
    copyright: '© 2025 Nexto',
    tagline: 'Built for devs who ship. Privacy-first, no lock-in.',
  },
};

export const onboardingContent: OnboardingContent = {
  welcome: {
    title: 'Start here!',
    description:
      'Welcome to Nexto! To get started, create your first task and then organize it into projects.',
    cta: 'Go to Tasks',
  },
  steps: {
    createTask: {
      title: 'Create your first task',
      description:
        'Start by creating a task. Click the button above to open the creation form. You can add a title, description, priority, and deadline.',
    },
    createProject: {
      title: 'Create your first project',
      description:
        'Organize your tasks into projects. Projects help you group related tasks and track progress toward larger goals.',
    },
    schedule: {
      title: 'Schedule your tasks',
      description:
        'Use auto-scheduling to automatically distribute your tasks in the calendar. The system will create events based on planned duration and deadlines.',
    },
    syncCalendar: {
      title: 'Sync Google Calendar',
      description:
        'Connect your Google Calendar to keep your events in sync. Go to your profile settings and connect your account to import meetings and avoid scheduling conflicts.',
    },
  },
  checklist: {
    title: 'Onboarding',
    steps: [
      { id: 'task_created', label: 'Create your first task' },
      { id: 'project_created', label: 'Create your first project' },
      { id: 'scheduled', label: 'Schedule your tasks' },
      { id: 'calendar_synced', label: 'Sync Google Calendar' },
    ],
  },
};
