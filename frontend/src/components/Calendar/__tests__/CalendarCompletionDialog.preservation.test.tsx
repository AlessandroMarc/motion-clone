/** @jest-environment jsdom */
/**
 * Property 2: Preservation - CalendarCompletionDialog shows "Complete entire task" for non-recurring tasks
 *
 * Validates: Requirements 3.1, 3.4
 *
 * Preservation tests document baseline dialog behavior that must not regress after the fix.
 * The recurring-task regression assertion (isRecurring=true case) is expected to FAIL on unfixed code.
 *
 * ON UNFIXED CODE: First two tests PASS — "Complete entire task" button is always shown.
 *                  Third test (isRecurring=true) FAILS — button should be hidden but isn't.
 * ON FIXED CODE:   All tests PASS — button is shown when isRecurring is false or not set,
 *                  and hidden when isRecurring is true.
 */

import { render, screen } from '@testing-library/react';
import { CalendarCompletionDialog } from '../CalendarCompletionDialog';

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
  }) => (open ? <div>{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogCancel: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  AlertDialogAction: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

describe('CalendarCompletionDialog — Preservation (Property 2): "Complete entire task" button', () => {
  it('shows "Complete entire task" button when isRecurring is not set', () => {
    render(
      <CalendarCompletionDialog
        open={true}
        onChoice={jest.fn()}
        onCancel={jest.fn()}
        sessionCount={3}
      />
    );
    expect(screen.getByText('Complete entire task')).toBeInTheDocument();
  });

  it('shows "Complete entire task" button when isRecurring is false', () => {
    render(
      <CalendarCompletionDialog
        open={true}
        onChoice={jest.fn()}
        onCancel={jest.fn()}
        sessionCount={2}
        isRecurring={false}
      />
    );
    expect(screen.getByText('Complete entire task')).toBeInTheDocument();
  });

  it('hides "Complete entire task" button when isRecurring is true', () => {
    render(
      <CalendarCompletionDialog
        open={true}
        onChoice={jest.fn()}
        onCancel={jest.fn()}
        sessionCount={3}
        isRecurring={true}
      />
    );
    expect(screen.queryByText('Complete entire task')).toBeNull();
  });

  it('shows "This session only" button in all cases', () => {
    render(
      <CalendarCompletionDialog
        open={true}
        onChoice={jest.fn()}
        onCancel={jest.fn()}
        sessionCount={2}
      />
    );
    expect(screen.getByText('This session only')).toBeInTheDocument();
  });
});
