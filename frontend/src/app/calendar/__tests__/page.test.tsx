import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CalendarPage from '../page';

// Mock ProtectedRoute to just render children
jest.mock('@/components/Auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('@/components/Calendar/WeekCalendar', () => ({
  WeekCalendar: ({
    onZenMode,
  }: {
    onTaskDropped?: () => void;
    onZenMode?: () => void;
  }) => (
    <div data-testid="week-calendar">
      <button data-testid="zen-mode-btn" onClick={onZenMode}>
        Zen Mode
      </button>
    </div>
  ),
}));

jest.mock('@/components/Calendar/ZenModeView', () => ({
  ZenModeView: ({ onExit }: { onExit: () => void }) => (
    <div data-testid="zen-mode-view">
      <button data-testid="exit-zen-btn" onClick={onExit}>
        Exit Zen
      </button>
    </div>
  ),
}));

jest.mock('@/components/Tasks/CalendarTasksPanel', () => ({
  CalendarTasksPanel: ({ refreshTrigger }: { refreshTrigger: number }) => (
    <div data-testid="calendar-tasks-panel" data-refresh={refreshTrigger}>
      Tasks Panel
    </div>
  ),
}));

jest.mock('@/components/Onboarding/OnboardingWelcomeBanner', () => ({
  OnboardingWelcomeBanner: () => (
    <div data-testid="onboarding-banner">Welcome Banner</div>
  ),
}));

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn().mockReturnValue(false),
}));

const { useIsMobile } = require('@/hooks/use-mobile');

describe('CalendarPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useIsMobile.mockReturnValue(false);
  });

  it('renders WeekCalendar', () => {
    render(<CalendarPage />);
    expect(screen.getByTestId('week-calendar')).toBeInTheDocument();
  });

  it('renders tasks panel on desktop (not mobile)', () => {
    useIsMobile.mockReturnValue(false);
    render(<CalendarPage />);
    expect(screen.getByTestId('calendar-tasks-panel')).toBeInTheDocument();
  });

  it('does not render tasks panel on mobile', () => {
    useIsMobile.mockReturnValue(true);
    render(<CalendarPage />);
    expect(
      screen.queryByTestId('calendar-tasks-panel')
    ).not.toBeInTheDocument();
  });

  it('renders the onboarding welcome banner', () => {
    render(<CalendarPage />);
    expect(screen.getByTestId('onboarding-banner')).toBeInTheDocument();
  });

  it('shows zen mode view when zen mode button is clicked', () => {
    render(<CalendarPage />);
    expect(screen.queryByTestId('zen-mode-view')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('zen-mode-btn'));

    expect(screen.getByTestId('zen-mode-view')).toBeInTheDocument();
    expect(screen.queryByTestId('week-calendar')).not.toBeInTheDocument();
  });

  it('exits zen mode when exit button is clicked', () => {
    render(<CalendarPage />);

    fireEvent.click(screen.getByTestId('zen-mode-btn'));
    expect(screen.getByTestId('zen-mode-view')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('exit-zen-btn'));
    expect(screen.queryByTestId('zen-mode-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('week-calendar')).toBeInTheDocument();
  });

  it('renders task panel toggle button on desktop', () => {
    useIsMobile.mockReturnValue(false);
    render(<CalendarPage />);
    const toggleBtn = screen.getByRole('button', { name: /hide tasks/i });
    expect(toggleBtn).toBeInTheDocument();
  });

  it('toggles the task panel visibility when toggle button is clicked', () => {
    useIsMobile.mockReturnValue(false);
    render(<CalendarPage />);

    // Panel should be visible initially
    expect(screen.getByTestId('calendar-tasks-panel')).toBeInTheDocument();

    // Click the hide button
    fireEvent.click(screen.getByRole('button', { name: /hide tasks/i }));

    // Toggle button label switches to "Show tasks"
    expect(
      screen.getByRole('button', { name: /show tasks/i })
    ).toBeInTheDocument();
  });
});
