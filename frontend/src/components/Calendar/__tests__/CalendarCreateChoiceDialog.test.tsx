import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { CalendarCreateChoiceDialog } from '../CalendarCreateChoiceDialog';

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipProvider: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
}));

jest.mock('lucide-react', () => ({
  ListChecks: () => <span data-testid="list-checks-icon" />,
  Calendar: () => <span data-testid="calendar-icon" />,
}));

describe('CalendarCreateChoiceDialog', () => {
  const baseProps = {
    open: true,
    onOpenChange: jest.fn(),
    onChooseTask: jest.fn(),
    onChooseGoogleEvent: jest.fn(),
    googleCalendarConnected: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dialog title', () => {
    render(<CalendarCreateChoiceDialog {...baseProps} />);
    expect(screen.getByText('Create New')).toBeInTheDocument();
  });

  it('renders slot label when provided', () => {
    render(
      <CalendarCreateChoiceDialog
        {...baseProps}
        slotLabel="Thursday, Apr 10 at 2:00 PM"
      />
    );
    expect(screen.getByText('Thursday, Apr 10 at 2:00 PM')).toBeInTheDocument();
  });

  it('does not render slot label when not provided', () => {
    render(<CalendarCreateChoiceDialog {...baseProps} />);
    const slotLabels = screen.queryByText(/at \d+:\d+ (AM|PM)/);
    expect(slotLabels).toBeNull();
  });

  it('calls onChooseTask when Task button is clicked', async () => {
    const onChooseTask = jest.fn();
    render(
      <CalendarCreateChoiceDialog {...baseProps} onChooseTask={onChooseTask} />
    );

    const taskButton = screen.getByText('Task').closest('button')!;
    await userEvent.click(taskButton);

    expect(onChooseTask).toHaveBeenCalledTimes(1);
  });

  it('calls onChooseGoogleEvent when Google Calendar button is clicked', async () => {
    const onChooseGoogleEvent = jest.fn();
    render(
      <CalendarCreateChoiceDialog
        {...baseProps}
        onChooseGoogleEvent={onChooseGoogleEvent}
      />
    );

    const googleButton = screen
      .getByText('Google Calendar Event')
      .closest('button')!;
    await userEvent.click(googleButton);

    expect(onChooseGoogleEvent).toHaveBeenCalledTimes(1);
  });

  it('disables Google Calendar button when not connected', () => {
    render(
      <CalendarCreateChoiceDialog
        {...baseProps}
        googleCalendarConnected={false}
      />
    );

    const googleButton = screen
      .getByText('Google Calendar Event')
      .closest('button')!;
    expect(googleButton).toBeDisabled();
  });

  it('enables Google Calendar button when connected', () => {
    render(
      <CalendarCreateChoiceDialog
        {...baseProps}
        googleCalendarConnected={true}
      />
    );

    const googleButton = screen
      .getByText('Google Calendar Event')
      .closest('button')!;
    expect(googleButton).not.toBeDisabled();
  });

  it('shows tooltip hint when Google Calendar is not connected', () => {
    render(
      <CalendarCreateChoiceDialog
        {...baseProps}
        googleCalendarConnected={false}
      />
    );

    expect(
      screen.getByText('Connect Google Calendar in Profile settings')
    ).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<CalendarCreateChoiceDialog {...baseProps} open={false} />);

    expect(screen.queryByText('Create New')).not.toBeInTheDocument();
  });

  it('renders both option descriptions', () => {
    render(<CalendarCreateChoiceDialog {...baseProps} />);
    expect(
      screen.getByText('Create a manually scheduled task')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Create an event on Google Calendar')
    ).toBeInTheDocument();
  });
});
