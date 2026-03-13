import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import {
  ProjectScheduleField,
  PERSONAL_SCHEDULE_TOKEN,
} from '../ProjectScheduleField';

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    activeSchedule: { id: 'active-schedule-1' },
  }),
}));

// Mock userSettingsService
jest.mock('@/services/userSettingsService', () => ({
  userSettingsService: {
    getUserSchedules: jest.fn().mockResolvedValue([
      { id: 'schedule-1', name: 'Work Schedule' },
      { id: 'schedule-2', name: 'Evening Schedule' },
    ]),
  },
}));

// Mock Select UI components to avoid Radix UI portal complexity
jest.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <div data-testid="select" data-value={value}>
      <button
        data-testid="select-trigger"
        onClick={() => onValueChange('schedule-1')}
      />
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    value,
    children,
    disabled,
  }: {
    value: string;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <div data-testid={`select-item-${value}`} aria-disabled={disabled}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => null,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => (
    <label>{children}</label>
  ),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const methods = useForm({ defaultValues: { scheduleId: '' } });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

describe('ProjectScheduleField', () => {
  it('uses a non-empty placeholder value for the personal-schedule option', () => {
    expect(PERSONAL_SCHEDULE_TOKEN).not.toBe('');
  });

  it('renders without errors inside a FormProvider', () => {
    render(
      <Wrapper>
        <ProjectScheduleField />
      </Wrapper>
    );
    expect(screen.getByText('Project schedule (optional)')).toBeInTheDocument();
  });

  it('calls onValueChange with the schedule id when a schedule is selected', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <ProjectScheduleField />
      </Wrapper>
    );

    await user.click(screen.getByTestId('select-trigger'));

    await waitFor(() => {
      // The Select mock fires onValueChange('schedule-1') on trigger click.
      // The select's data-value should reflect the updated form value.
      const select = screen.getByTestId('select');
      expect(select.getAttribute('data-value')).toBe('schedule-1');
    });
  });

  it('shows loading text while schedules are being fetched', async () => {
    const { userSettingsService } = jest.requireMock(
      '@/services/userSettingsService'
    );
    // Return a promise that stays pending so loading state is visible
    let resolve: (v: { id: string; name: string }[]) => void;
    userSettingsService.getUserSchedules.mockReturnValueOnce(
      new Promise(r => {
        resolve = r;
      })
    );

    render(
      <Wrapper>
        <ProjectScheduleField />
      </Wrapper>
    );

    expect(screen.getByTestId('select-item-__loading')).toBeInTheDocument();

    // Clean up the pending promise
    resolve!([]);
  });
});
