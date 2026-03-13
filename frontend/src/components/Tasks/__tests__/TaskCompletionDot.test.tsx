import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskCompletionDot } from '../TaskCompletionDot';
import { fireConfetti } from '@/utils/confetti';

jest.mock('@/utils/confetti', () => ({
  fireConfetti: jest.fn(),
}));

// Mock the alert dialog so it renders inline (no portals)
jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  AlertDialogAction: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

// The component reads NEXT_PUBLIC_CONFIRM_TASK_COMPLETION at module scope.
// Default is confirmation enabled (not '0'), which matches the component default.
// We explicitly set it here for clarity.
beforeAll(() => {
  process.env.NEXT_PUBLIC_CONFIRM_TASK_COMPLETION = '1';
});

describe('TaskCompletionDot — confetti', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fires confetti immediately when confirming completion (before onToggle resolves)', async () => {
    const callOrder: string[] = [];

    const onToggle = jest.fn(
      () =>
        new Promise<void>(resolve => {
          callOrder.push('onToggle-called');
          setTimeout(() => {
            callOrder.push('onToggle-resolved');
            resolve();
          }, 50);
        })
    );

    (fireConfetti as jest.Mock).mockImplementation(() => {
      callOrder.push('confetti');
    });

    render(<TaskCompletionDot completed={false} onToggle={onToggle} />);

    // Click the completion dot — this opens the confirmation dialog
    const dot = screen.getByRole('button', {
      name: /mark task as complete/i,
    });
    await act(async () => {
      await userEvent.click(dot);
    });

    // The confirmation dialog should now be visible
    const confirmBtn = screen.getByRole('button', { name: /^complete$/i });
    await act(async () => {
      await userEvent.click(confirmBtn);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(fireConfetti).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(true);

    // Confetti should fire before onToggle resolves
    expect(callOrder.indexOf('confetti')).toBeLessThan(
      callOrder.indexOf('onToggle-resolved')
    );
  });

  it('does NOT fire confetti when uncompleting', async () => {
    const onToggle = jest.fn();

    render(<TaskCompletionDot completed={true} onToggle={onToggle} />);

    const button = screen.getByRole('button', {
      name: /mark task as incomplete/i,
    });

    await act(async () => {
      await userEvent.click(button);
    });

    expect(fireConfetti).not.toHaveBeenCalled();
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
