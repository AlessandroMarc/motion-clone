import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskPriorityField } from '@/components/Tasks/forms/TaskPriorityField';

// Mock the form utilities
jest.mock('@/utils/formUtils', () => ({
  hasFieldError: jest.fn(),
  getFieldError: jest.fn(),
  getPriorityColor: jest.fn(priority => {
    const colors = {
      low: 'bg-green-500',
      medium: 'bg-yellow-500',
      high: 'bg-red-500',
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-500';
  }),
}));

const TestWrapper = ({
  value = 'medium',
  onValueChange = jest.fn(),
  errors = {},
}: {
  value?: 'low' | 'medium' | 'high';
  onValueChange?: (value: 'low' | 'medium' | 'high') => void;
  errors?: any;
}) => {
  return (
    <TaskPriorityField
      value={value}
      onValueChange={onValueChange}
      errors={errors}
    />
  );
};

describe('TaskPriorityField', () => {
  it('should render with default props', () => {
    render(<TestWrapper />);

    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should render with custom props', () => {
    const mockOnValueChange = jest.fn();

    render(
      <TestWrapper value="high" onValueChange={mockOnValueChange} errors={{}} />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should show all priority options', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    expect(screen.getByText('Low Priority')).toBeInTheDocument();
    expect(screen.getByText('Medium Priority')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
  });

  it('should call onValueChange when option is selected', async () => {
    const user = userEvent.setup();
    const mockOnValueChange = jest.fn();

    render(<TestWrapper onValueChange={mockOnValueChange} />);

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    const highOption = screen.getByText('High Priority');
    await user.click(highOption);

    expect(mockOnValueChange).toHaveBeenCalledWith('high');
  });

  it('should show error when field has error', () => {
    const { hasFieldError, getFieldError } = require('@/utils/formUtils');
    hasFieldError.mockReturnValue(true);
    getFieldError.mockReturnValue('Priority is required');

    render(
      <TestWrapper errors={{ priority: { message: 'Priority is required' } }} />
    );

    expect(screen.getByText('Priority is required')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveClass('border-red-500');
  });

  it('should not show error when field has no error', () => {
    const { hasFieldError, getFieldError } = require('@/utils/formUtils');
    hasFieldError.mockReturnValue(false);
    getFieldError.mockReturnValue(undefined);

    render(<TestWrapper />);

    expect(screen.queryByText('Priority is required')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).not.toHaveClass('border-red-500');
  });

  it('should display priority colors correctly', () => {
    const { getPriorityColor } = require('@/utils/formUtils');

    render(<TestWrapper value="high" />);

    expect(getPriorityColor).toHaveBeenCalledWith('high');
  });

  it('should be accessible', () => {
    render(<TestWrapper />);

    const combobox = screen.getByRole('combobox');
    const label = screen.getByLabelText(/priority/i);

    expect(combobox).toHaveAttribute('id', 'priority');
    expect(label).toHaveAttribute('for', 'priority');
  });
});
