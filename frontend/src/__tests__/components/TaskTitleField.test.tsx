import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { TaskTitleField } from '@/components/Tasks/forms/TaskTitleField';

// Mock the form utilities
jest.mock('@/utils/formUtils', () => ({
  hasFieldError: jest.fn(),
  getFieldError: jest.fn(),
}));

const TestWrapper = ({ errors = {} }: { errors?: any }) => {
  const { register } = useForm();

  return <TaskTitleField register={register} errors={errors} />;
};

describe('TaskTitleField', () => {
  it('should render with default props', () => {
    render(<TestWrapper />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Enter task title...')
    ).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should render with custom props', () => {
    const { register } = useForm();

    render(
      <TaskTitleField
        register={register}
        errors={{}}
        id="custom-title"
        className="custom-class"
        placeholder="Custom placeholder"
      />
    );

    expect(screen.getByLabelText(/title/i)).toHaveAttribute(
      'id',
      'custom-title'
    );
    expect(
      screen.getByPlaceholderText('Custom placeholder')
    ).toBeInTheDocument();
  });

  it('should show error when field has error', () => {
    const { hasFieldError, getFieldError } = require('@/utils/formUtils');
    hasFieldError.mockReturnValue(true);
    getFieldError.mockReturnValue('Title is required');

    render(
      <TestWrapper errors={{ title: { message: 'Title is required' } }} />
    );

    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('border-red-500');
  });

  it('should not show error when field has no error', () => {
    const { hasFieldError, getFieldError } = require('@/utils/formUtils');
    hasFieldError.mockReturnValue(false);
    getFieldError.mockReturnValue(undefined);

    render(<TestWrapper />);

    expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).not.toHaveClass('border-red-500');
  });

  it('should be accessible', () => {
    render(<TestWrapper />);

    const input = screen.getByRole('textbox');
    const label = screen.getByLabelText(/title/i);

    expect(input).toHaveAttribute('id', 'title');
    expect(label).toHaveAttribute('for', 'title');
  });
});
