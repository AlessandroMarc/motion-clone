import React from 'react';
import { render, screen } from '@testing-library/react';
import type {
  Task,
  CalendarEvent,
  CalendarEventTask,
  CalendarEventUnion,
} from '@/types';
import { CalendarEventCard } from '../CalendarEventCard';

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('@/utils/calendarUtils', () => ({
  formatEventTime: (start: Date, end: Date) =>
    `${start.getHours()}:00 - ${end.getHours()}:00`,
}));

// Fixed future dates so tests are time-stable
const FUTURE_START = new Date('2099-06-15T10:00:00');
const FUTURE_END = new Date('2099-06-15T11:00:00');
const PAST_START = new Date('2000-01-01T10:00:00');
const PAST_END = new Date('2000-01-01T11:00:00');

const makeCalendarEvent = (
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent =>
  ({
    id: 'ev-1',
    title: 'Meeting',
    start_time: FUTURE_START,
    end_time: FUTURE_END,
    user_id: 'user-1',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }) as CalendarEvent;

const makeTaskEvent = (
  overrides: Partial<CalendarEventTask> = {}
): CalendarEventTask => ({
  id: 'task-ev-1',
  title: 'Task Event',
  start_time: FUTURE_START,
  end_time: FUTURE_END,
  user_id: 'user-1',
  created_at: new Date(),
  updated_at: new Date(),
  linked_task_id: 'task-1',
  completed_at: null,
  ...overrides,
});

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test Task',
  description: '',
  due_date: null,
  priority: 'medium',
  status: 'not-started',
  dependencies: [],
  blockedBy: [],
  user_id: 'user-1',
  created_at: new Date(),
  updated_at: new Date(),
  planned_duration_minutes: 60,
  actual_duration_minutes: 0,
  ...overrides,
});

describe('CalendarEventCard', () => {
  it('renders the event title', () => {
    render(
      <CalendarEventCard event={makeCalendarEvent({ title: 'Stand-up' })} />
    );
    expect(screen.getByText('Stand-up')).toBeInTheDocument();
  });

  it('renders formatted time from formatEventTime', () => {
    render(<CalendarEventCard event={makeCalendarEvent()} />);
    // Mock returns `${start.getHours()}:00 - ${end.getHours()}:00`
    expect(screen.getByText(/10:00 - 11:00/)).toBeInTheDocument();
  });

  it('does not render completion checkmark for a regular calendar event', () => {
    const { container } = render(
      <CalendarEventCard event={makeCalendarEvent()} />
    );
    // CheckCircle2 renders as an svg; there should be none
    expect(container.querySelectorAll('svg')).toHaveLength(0);
  });

  it('shows CheckCircle2 icon when task event is completed', () => {
    const event = makeTaskEvent({ completed_at: new Date() });
    const { container } = render(<CalendarEventCard event={event} />);
    // At least one SVG (CheckCircle2)
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });

  it('applies line-through class to title when task event is completed', () => {
    const event = makeTaskEvent({ completed_at: new Date() });
    render(<CalendarEventCard event={event} />);
    const titleEl = screen.getByText('Task Event');
    expect(titleEl.className).toContain('line-through');
  });

  it('does NOT apply line-through to title for an incomplete task event', () => {
    const event = makeTaskEvent({ completed_at: null });
    render(<CalendarEventCard event={event} />);
    const titleEl = screen.getByText('Task Event');
    expect(titleEl.className).not.toContain('line-through');
  });

  it('applies opacity/grayscale styling for past events', () => {
    const event = makeCalendarEvent({
      start_time: PAST_START,
      end_time: PAST_END,
    });
    const { container } = render(<CalendarEventCard event={event} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('grayscale');
  });

  it('does NOT apply past styling for future events', () => {
    const event = makeCalendarEvent({
      start_time: FUTURE_START,
      end_time: FUTURE_END,
    });
    const { container } = render(<CalendarEventCard event={event} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).not.toContain('grayscale');
  });

  it('shows "Past deadline" when task event starts after the due_date end-of-day', () => {
    const task = makeTask({ due_date: new Date('2020-01-01') });
    const event = makeTaskEvent({
      start_time: new Date('2020-01-03T09:00:00'),
      end_time: new Date('2020-01-03T10:00:00'),
    });
    render(<CalendarEventCard event={event} task={task} />);
    expect(screen.getByText('Past deadline')).toBeInTheDocument();
  });

  it('does NOT show "Past deadline" when task event is on the deadline day', () => {
    const task = makeTask({ due_date: new Date('2025-12-31') });
    const event = makeTaskEvent({
      start_time: new Date('2025-12-31T09:00:00'),
      end_time: new Date('2025-12-31T10:00:00'),
    });
    render(<CalendarEventCard event={event} task={task} />);
    expect(screen.queryByText('Past deadline')).not.toBeInTheDocument();
  });

  it('applies a custom style prop to the card element', () => {
    const style = { top: '42px', height: '80px' };
    const { container } = render(
      <CalendarEventCard event={makeCalendarEvent()} style={style} />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.style.top).toBe('42px');
    expect(card.style.height).toBe('80px');
  });

  it('does not show "Past deadline" for a regular (non-task) calendar event', () => {
    const task = makeTask({ due_date: new Date('2020-01-01') });
    const event = makeCalendarEvent({
      start_time: new Date('2020-06-01T09:00:00'),
      end_time: new Date('2020-06-01T10:00:00'),
    });
    render(
      <CalendarEventCard event={event as CalendarEventUnion} task={task} />
    );
    expect(screen.queryByText('Past deadline')).not.toBeInTheDocument();
  });

  it('shows CheckCircle2 even when the task event is past a deadline', () => {
    const task = makeTask({ due_date: new Date('2020-01-01') });
    const event = makeTaskEvent({
      start_time: new Date('2020-01-03T09:00:00'),
      end_time: new Date('2020-01-03T10:00:00'),
      completed_at: new Date(),
    });
    const { container } = render(
      <CalendarEventCard event={event} task={task} />
    );
    // CheckCircle2 SVG should still be present
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });
});
