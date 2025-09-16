import { render, screen, fireEvent } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { ProjectDeadlineField } from '../ProjectDeadlineField';

// Mock the project service
jest.mock('@/services/projectService', () => ({
  projectService: {
    getAllProjects: jest.fn(),
  },
}));

import { projectService } from '@/services/projectService';

const mockProjectService = projectService as jest.Mocked<typeof projectService>;

// Test wrapper component that provides form context
function TestWrapper({ children }: { children: React.ReactNode }) {
  const {
    register,
    formState: { errors },
  } = useForm({
    defaultValues: {
      deadline: '',
    },
  });

  return (
    <div>
      {children}
      <input {...register('deadline')} data-testid="hidden-deadline-input" />
    </div>
  );
}

describe('ProjectDeadlineField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render deadline field correctly', () => {
    render(
      <TestWrapper>
        <ProjectDeadlineField errors={{}} />
      </TestWrapper>
    );

    expect(screen.getByText('Deadline')).toBeInTheDocument();
    expect(screen.getByLabelText('Deadline')).toBeInTheDocument();
    expect(screen.getByDisplayValue('')).toBeInTheDocument();
  });

  it('should handle date input changes', () => {
    render(
      <TestWrapper>
        <ProjectDeadlineField errors={{}} />
      </TestWrapper>
    );

    const dateInput = screen.getByLabelText('Deadline');
    fireEvent.change(dateInput, { target: { value: '2024-12-31' } });

    expect(dateInput).toHaveValue('2024-12-31');
  });

  it('should handle empty date input', () => {
    render(
      <TestWrapper>
        <ProjectDeadlineField errors={{}} />
      </TestWrapper>
    );

    const dateInput = screen.getByLabelText('Deadline');
    fireEvent.change(dateInput, { target: { value: '' } });

    expect(dateInput).toHaveValue('');
  });

  it('should display validation errors', () => {
    const errors = {
      deadline: {
        message: 'Invalid date format',
      },
    };

    render(
      <TestWrapper>
        <ProjectDeadlineField errors={errors} />
      </TestWrapper>
    );

    expect(screen.getByText('Invalid date format')).toBeInTheDocument();
  });

  it('should handle different date formats', () => {
    render(
      <TestWrapper>
        <ProjectDeadlineField errors={{}} />
      </TestWrapper>
    );

    const dateInput = screen.getByLabelText('Deadline');

    // Test various date formats
    const testDates = [
      '2024-01-01',
      '2024-12-31',
      '2024-02-29', // Leap year
      '2023-02-28', // Non-leap year
    ];

    testDates.forEach(date => {
      fireEvent.change(dateInput, { target: { value: date } });
      expect(dateInput).toHaveValue(date);
    });
  });

  it('should handle edge case dates', () => {
    render(
      <TestWrapper>
        <ProjectDeadlineField errors={{}} />
      </TestWrapper>
    );

    const dateInput = screen.getByLabelText('Deadline');

    // Test edge case dates
    const edgeCaseDates = [
      '2000-01-01', // Y2K
      '2030-12-31', // Future date
      '1900-01-01', // Very old date
    ];

    edgeCaseDates.forEach(date => {
      fireEvent.change(dateInput, { target: { value: date } });
      expect(dateInput).toHaveValue(date);
    });
  });

  it('should handle invalid date inputs gracefully', () => {
    render(
      <TestWrapper>
        <ProjectDeadlineField errors={{}} />
      </TestWrapper>
    );

    const dateInput = screen.getByLabelText('Deadline');

    // Test invalid date formats
    const invalidDates = [
      'invalid-date',
      '2024-13-01', // Invalid month
      '2024-01-32', // Invalid day
      '2024-02-30', // Invalid day for February
      'not-a-date',
    ];

    invalidDates.forEach(date => {
      fireEvent.change(dateInput, { target: { value: date } });
      // The input should accept the value (HTML5 validation will handle invalid dates)
      expect(dateInput).toHaveValue(date);
    });
  });

  it('should have proper accessibility attributes', () => {
    render(
      <TestWrapper>
        <ProjectDeadlineField errors={{}} />
      </TestWrapper>
    );

    const dateInput = screen.getByLabelText('Deadline');
    expect(dateInput).toHaveAttribute('type', 'date');
    expect(dateInput).toHaveAttribute('id', 'deadline');
  });

  it('should handle custom className', () => {
    render(
      <TestWrapper>
        <ProjectDeadlineField errors={{}} className="custom-class" />
      </TestWrapper>
    );

    const dateInput = screen.getByLabelText('Deadline');
    expect(dateInput).toHaveClass('custom-class');
  });

  it('should handle custom id', () => {
    render(
      <TestWrapper>
        <ProjectDeadlineField errors={{}} id="custom-deadline" />
      </TestWrapper>
    );

    const dateInput = screen.getByLabelText('Deadline');
    expect(dateInput).toHaveAttribute('id', 'custom-deadline');
  });

  it('should handle form validation state', () => {
    const errors = {
      deadline: {
        message: 'Deadline is required',
      },
    };

    render(
      <TestWrapper>
        <ProjectDeadlineField errors={errors} />
      </TestWrapper>
    );

    const dateInput = screen.getByLabelText('Deadline');
    expect(dateInput).toHaveClass('border-red-500');
    expect(screen.getByText('Deadline is required')).toBeInTheDocument();
  });

  it('should handle no errors state', () => {
    render(
      <TestWrapper>
        <ProjectDeadlineField errors={{}} />
      </TestWrapper>
    );

    const dateInput = screen.getByLabelText('Deadline');
    expect(dateInput).not.toHaveClass('border-red-500');
    expect(
      screen.queryByText(/required|invalid|error/i)
    ).not.toBeInTheDocument();
  });
});
