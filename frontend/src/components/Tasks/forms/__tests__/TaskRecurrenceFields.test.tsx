/**
 * Tests for TaskRecurrenceFields React component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskRecurrenceFields } from '@/components/Tasks/forms/TaskRecurrenceFields';
import type { FieldErrors } from 'react-hook-form';
import type { TaskFormData } from '@/hooks/useTaskForm';

describe('TaskRecurrenceFields', () => {
  const mockOnIsRecurringChange = jest.fn();
  const mockOnPatternChange = jest.fn();
  const mockOnIntervalChange = jest.fn();
  const emptyErrors: FieldErrors<TaskFormData> = {};

  // Store original methods to restore later
  let originalHasPointerCapture: any;
  let originalSetPointerCapture: any;
  let originalReleasePointerCapture: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    // Save original methods
    originalHasPointerCapture = HTMLElement.prototype.hasPointerCapture;
    originalSetPointerCapture = HTMLElement.prototype.setPointerCapture;
    originalReleasePointerCapture = HTMLElement.prototype.releasePointerCapture;

    // Patch methods
    if (!HTMLElement.prototype.hasPointerCapture) {
      HTMLElement.prototype.hasPointerCapture = () => false;
    }
    if (!HTMLElement.prototype.setPointerCapture) {
      HTMLElement.prototype.setPointerCapture = () => {};
    }
    if (!HTMLElement.prototype.releasePointerCapture) {
      HTMLElement.prototype.releasePointerCapture = () => {};
    }
  });

  afterAll(() => {
    // Restore original methods
    if (originalHasPointerCapture !== undefined) {
      HTMLElement.prototype.hasPointerCapture = originalHasPointerCapture;
    } else {
      delete (HTMLElement.prototype as any).hasPointerCapture;
    }
    if (originalSetPointerCapture !== undefined) {
      HTMLElement.prototype.setPointerCapture = originalSetPointerCapture;
    } else {
      delete (HTMLElement.prototype as any).setPointerCapture;
    }
    if (originalReleasePointerCapture !== undefined) {
      HTMLElement.prototype.releasePointerCapture = originalReleasePointerCapture;
    } else {
      delete (HTMLElement.prototype as any).releasePointerCapture;
    }
  });

  describe('Checkbox Toggle', () => {
    it('should render "Repeating Task" checkbox', () => {
      render(
        <TaskRecurrenceFields
          isRecurring={false}
          onIsRecurringChange={mockOnIsRecurringChange}
          errors={emptyErrors}
        />
      );

      const checkbox = screen.getByRole('checkbox', {
        name: /repeating task/i,
      });
      expect(checkbox).toBeInTheDocument();
    });

    it('should call onIsRecurringChange when checkbox is clicked', async () => {
      const user = await userEvent.setup();
      render(
        <TaskRecurrenceFields
          isRecurring={false}
          onIsRecurringChange={mockOnIsRecurringChange}
          errors={emptyErrors}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(mockOnIsRecurringChange).toHaveBeenCalledWith(true);
    });

    it('should reflect checked state from props', () => {
      render(
        <TaskRecurrenceFields
          isRecurring={true}
          onIsRecurringChange={mockOnIsRecurringChange}
          errors={emptyErrors}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should reflect unchecked state from props', () => {
      render(
        <TaskRecurrenceFields
          isRecurring={false}
          onIsRecurringChange={mockOnIsRecurringChange}
          errors={emptyErrors}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Conditional Fields Visibility', () => {
    it('should not show pattern and interval fields when isRecurring is false', () => {
      render(
        <TaskRecurrenceFields
          isRecurring={false}
          onIsRecurringChange={mockOnIsRecurringChange}
          errors={emptyErrors}
        />
      );

      expect(screen.queryByLabelText(/pattern/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/every/i)).not.toBeInTheDocument();
    });

    it('should show pattern and interval fields when isRecurring is true', () => {
      render(
        <TaskRecurrenceFields
          isRecurring={true}
          onIsRecurringChange={mockOnIsRecurringChange}
          recurrencePattern="daily"
          onPatternChange={mockOnPatternChange}
          recurrenceInterval={1}
          onIntervalChange={mockOnIntervalChange}
          errors={emptyErrors}
        />
      );

      expect(screen.getByText('Pattern')).toBeInTheDocument();
      expect(screen.getByLabelText(/every/i)).toBeInTheDocument();
    });
  });

  describe('Recurrence Pattern Selection', () => {
    it('should render pattern select with options', () => {
      render(
        <TaskRecurrenceFields
          isRecurring={true}
          onIsRecurringChange={mockOnIsRecurringChange}
          recurrencePattern="daily"
          onPatternChange={mockOnPatternChange}
          recurrenceInterval={1}
          onIntervalChange={mockOnIntervalChange}
          errors={emptyErrors}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toHaveTextContent('Daily');
    });

    it('should display selected pattern', () => {
      render(
        <TaskRecurrenceFields
          isRecurring={true}
          onIsRecurringChange={mockOnIsRecurringChange}
          recurrencePattern="weekly"
          onPatternChange={mockOnPatternChange}
          recurrenceInterval={1}
          onIntervalChange={mockOnIntervalChange}
          errors={emptyErrors}
        />
      );

      expect(screen.getByRole('combobox')).toHaveTextContent('Weekly');
    });

    it('should render an interactive pattern combobox', () => {
      render(
        <TaskRecurrenceFields
          isRecurring={true}
          onIsRecurringChange={mockOnIsRecurringChange}
          recurrencePattern="daily"
          onPatternChange={mockOnPatternChange}
          recurrenceInterval={1}
          onIntervalChange={mockOnIntervalChange}
          errors={emptyErrors}
        />
      );

      const patternSelect = screen.getByRole('combobox');
      expect(patternSelect).toBeInTheDocument();
      expect(patternSelect).toHaveAttribute('aria-expanded');
    });
  });

  describe('Recurrence Interval Input', () => {
    it('should render interval input with default value', () => {
      render(
        <TaskRecurrenceFields
          isRecurring={true}
          onIsRecurringChange={mockOnIsRecurringChange}
          recurrencePattern="daily"
          onPatternChange={mockOnPatternChange}
          recurrenceInterval={2}
          onIntervalChange={mockOnIntervalChange}
          errors={emptyErrors}
        />
      );

      const intervalInput = screen
        .getByLabelText(/every/i)
        .parentElement?.querySelector('input[type="number"]');
      expect(intervalInput).toHaveValue(2);
    });

    it('should call onIntervalChange when value is updated', async () => {
      const user = await userEvent.setup();
      render(
        <TaskRecurrenceFields
          isRecurring={true}
          onIsRecurringChange={mockOnIsRecurringChange}
          recurrencePattern="daily"
          onPatternChange={mockOnPatternChange}
          recurrenceInterval={1}
          onIntervalChange={mockOnIntervalChange}
          errors={emptyErrors}
        />
      );

      const intervalInput = screen
        .getByLabelText(/every/i)
        .parentElement?.querySelector(
          'input[type="number"]'
        ) as HTMLInputElement;
      await user.clear(intervalInput);
      await user.type(intervalInput, '3');

      expect(mockOnIntervalChange).toHaveBeenCalled();
    });

    it('should enforce minimum interval of 1', async () => {
      render(
        <TaskRecurrenceFields
          isRecurring={true}
          onIsRecurringChange={mockOnIsRecurringChange}
          recurrencePattern="daily"
          onPatternChange={mockOnPatternChange}
          recurrenceInterval={1}
          onIntervalChange={mockOnIntervalChange}
          errors={emptyErrors}
        />
      );

      const intervalInput = screen
        .getByLabelText(/every/i)
        .parentElement?.querySelector(
          'input[type="number"]'
        ) as HTMLInputElement;
      fireEvent.change(intervalInput, { target: { value: '0' } });

      expect(mockOnIntervalChange).toHaveBeenCalledWith(1);
    });
  });

  describe('Unit Label Display', () => {
    it('should show "day(s)" when pattern is daily', () => {
      render(
        <TaskRecurrenceFields
          isRecurring={true}
          onIsRecurringChange={mockOnIsRecurringChange}
          recurrencePattern="daily"
          onPatternChange={mockOnPatternChange}
          recurrenceInterval={1}
          onIntervalChange={mockOnIntervalChange}
          errors={emptyErrors}
        />
      );

      expect(screen.getByText('day(s)')).toBeInTheDocument();
    });

    it('should show "week(s)" when pattern is weekly', () => {
      render(
        <TaskRecurrenceFields
          isRecurring={true}
          onIsRecurringChange={mockOnIsRecurringChange}
          recurrencePattern="weekly"
          onPatternChange={mockOnPatternChange}
          recurrenceInterval={1}
          onIntervalChange={mockOnIntervalChange}
          errors={emptyErrors}
        />
      );

      expect(screen.getByText('week(s)')).toBeInTheDocument();
    });

    it('should show "month(s)" when pattern is monthly', () => {
      render(
        <TaskRecurrenceFields
          isRecurring={true}
          onIsRecurringChange={mockOnIsRecurringChange}
          recurrencePattern="monthly"
          onPatternChange={mockOnPatternChange}
          recurrenceInterval={1}
          onIntervalChange={mockOnIntervalChange}
          errors={emptyErrors}
        />
      );

      expect(screen.getByText('month(s)')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display pattern error message', () => {
      const errorMessage = 'Pattern is required for repeating tasks';
      const errors: FieldErrors<TaskFormData> = {
        recurrence_pattern: {
          message: errorMessage,
        },
      } as unknown as FieldErrors<TaskFormData>;

      render(
        <TaskRecurrenceFields
          isRecurring={true}
          onIsRecurringChange={mockOnIsRecurringChange}
          recurrencePattern={undefined}
          onPatternChange={mockOnPatternChange}
          recurrenceInterval={1}
          onIntervalChange={mockOnIntervalChange}
          errors={errors}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should display interval error message', () => {
      const errorMessage = 'Interval must be at least 1';
      const errors: FieldErrors<TaskFormData> = {
        recurrence_interval: {
          message: errorMessage,
        },
      } as unknown as FieldErrors<TaskFormData>;

      render(
        <TaskRecurrenceFields
          isRecurring={true}
          onIsRecurringChange={mockOnIsRecurringChange}
          recurrencePattern="daily"
          onPatternChange={mockOnPatternChange}
          recurrenceInterval={0}
          onIntervalChange={mockOnIntervalChange}
          errors={errors}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should apply error styling to pattern select when error exists', () => {
      const errors: FieldErrors<TaskFormData> = {
        recurrence_pattern: {
          message: 'Error',
        },
      } as unknown as FieldErrors<TaskFormData>;

      const { container } = render(
        <TaskRecurrenceFields
          isRecurring={true}
          onIsRecurringChange={mockOnIsRecurringChange}
          recurrencePattern={undefined}
          onPatternChange={mockOnPatternChange}
          recurrenceInterval={1}
          onIntervalChange={mockOnIntervalChange}
          errors={errors}
        />
      );

      const trigger = container.querySelector('[class*="border-red-500"]');
      expect(trigger).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to root container', () => {
      const { container } = render(
        <TaskRecurrenceFields
          isRecurring={false}
          onIsRecurringChange={mockOnIsRecurringChange}
          errors={emptyErrors}
          className="custom-class"
        />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined recurrencePattern gracefully', () => {
      render(
        <TaskRecurrenceFields
          isRecurring={true}
          onIsRecurringChange={mockOnIsRecurringChange}
          recurrencePattern={undefined}
          onPatternChange={mockOnPatternChange}
          recurrenceInterval={1}
          onIntervalChange={mockOnIntervalChange}
          errors={emptyErrors}
        />
      );

      expect(screen.getByText('period(s)')).toBeInTheDocument();
    });

    it('should default recurrenceInterval to 1 if not provided', () => {
      const { container } = render(
        <TaskRecurrenceFields
          isRecurring={true}
          onIsRecurringChange={mockOnIsRecurringChange}
          recurrencePattern="daily"
          onPatternChange={mockOnPatternChange}
          onIntervalChange={mockOnIntervalChange}
          errors={emptyErrors}
        />
      );

      const intervalInput = container.querySelector(
        'input[type="number"]'
      ) as HTMLInputElement;
      expect(intervalInput.value).toBe('1');
    });
  });
});
