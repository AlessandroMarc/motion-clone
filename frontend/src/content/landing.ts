/**
 * Landing Page Content
 * 
 * All text content for the landing/onboarding page.
 * Edit this file to update copy without touching components.
 */

export const landingContent = {
  // Navigation
  nav: {
    brand: 'Nexto',
    cta: 'Get Started',
    dashboard: 'Go to Dashboard',
  },

  // Hero Section
  hero: {
    headline: 'Your Time, Intelligently Scheduled',
    subheadline:
      'Stop juggling calendars and to-do lists. Nexto automatically schedules your tasks around your life, so you can focus on what actually matters.',
    primaryCta: 'Start Scheduling for Free',
    secondaryCta: 'See How It Works',
    badge: 'AI-Powered Scheduling',
  },

  // Features Section
  features: {
    sectionTitle: 'Scheduling That Thinks for You',
    sectionSubtitle:
      'Drop in your tasks, set your priorities, and let the algorithm do the heavy lifting.',
    items: [
      {
        id: 'smart-scheduling',
        title: 'Smart Auto-Scheduling',
        description:
          'Tasks automatically find the perfect slot in your calendar based on deadlines, priority, and your working hours.',
        icon: 'Brain',
      },
      {
        id: 'priority-aware',
        title: 'Priority-Aware Planning',
        description:
          'High-priority items get scheduled first. Low-priority tasks fill the gaps. No more decision fatigue.',
        icon: 'Target',
      },
      {
        id: 'calendar-sync',
        title: 'Calendar Integration',
        description:
          'Syncs with Google Calendar to work around your existing meetings and commitments seamlessly.',
        icon: 'Calendar',
      },
      {
        id: 'flexible-reschedule',
        title: 'Flexible Rescheduling',
        description:
          'Plans change. Drag and drop to reschedule, or let the system automatically adjust when things shift.',
        icon: 'RefreshCw',
      },
    ],
  },

  // Benefits Section
  benefits: {
    sectionTitle: 'Why Teams Love Nexto',
    items: [
      {
        id: 'save-time',
        metric: '2+ hours',
        label: 'saved weekly on planning',
      },
      {
        id: 'focus',
        metric: '40%',
        label: 'more deep work time',
      },
      {
        id: 'deadlines',
        metric: '95%',
        label: 'on-time task completion',
      },
    ],
  },

  // How It Works Section
  howItWorks: {
    sectionTitle: 'How It Works',
    sectionSubtitle: 'Three steps to a stress-free schedule',
    steps: [
      {
        number: '01',
        title: 'Add Your Tasks',
        description:
          'Create tasks with deadlines, estimated duration, and priority levels.',
      },
      {
        number: '02',
        title: 'Set Your Availability',
        description:
          'Define your working hours and sync your calendar to block off existing commitments.',
      },
      {
        number: '03',
        title: 'Let It Schedule',
        description:
          'Watch as tasks automatically populate your calendar in the optimal order.',
      },
    ],
  },

  // Final CTA Section
  finalCta: {
    headline: 'Ready to Reclaim Your Time?',
    subheadline:
      'Join thousands of professionals who have stopped overthinking their schedule.',
    primaryCta: "Get Started — It's Free",
    note: 'No credit card required',
  },

  // Footer
  footer: {
    copyright: '© 2025 Nexto. All rights reserved.',
    tagline: 'Built for people who value their time.',
  },
};

export type LandingContent = typeof landingContent;
