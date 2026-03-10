import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import CalendarEditDialog from '../CalendarEditDialog';
import { fireConfetti } from '@/utils/confetti';

jest.mock('@/utils/confetti', () => ({
  fireConfetti: jest.fn(),
}));

// Mock Radix dialog primitives so they render inline
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...rest }: any) => (
    <button onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock('lucide-react', () => ({
  CheckCircle2: ({ className }: any) => (
    <span data-testid="check-icon" className={className} />
  ),
  Clock: () => <span />,
  FileText: () => <span />,
  AlignLeft: () => <span />,
}));

describe('CalendarEditDialog — task completion', () => {
  const baseProps = {
    open: true,
    onOpenChange: jest.fn(),
    title: 'Work session',
    description: '',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    isTaskEvent: true,
    completed: false,
    onCompletedChange: jest.fn(),
    onLinkClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onCompletedChange when clicking "Complete task"', async () => {
    const onCompletedChange = jest.fn();

    render(
      <CalendarEditDialog
        {...baseProps}
        onCompletedChange={onCompletedChange}
      />
    );

    const completeBtn = screen.getByRole('button', {
      name: /complete task/i,
    });

    await act(async () => {
      await userEvent.click(completeBtn);
    });

    expect(onCompletedChange).toHaveBeenCalledWith(true);
    // CalendarEditDialog delegates confetti to the parent (useCalendarDialogs)
    expect(fireConfetti).not.toHaveBeenCalled();
  });

  it('shows "Task completed" text when already completed', () => {
    render(<CalendarEditDialog {...baseProps} completed={true} />);

    expect(screen.getByText(/task completed/i)).toBeInTheDocument();
  });
});
