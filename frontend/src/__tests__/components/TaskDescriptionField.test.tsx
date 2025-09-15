import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { TaskDescriptionField } from '@/components/Tasks/forms/TaskDescriptionField';

// Mock the form utilities
jest.mock('@/utils/formUtils', () => ({
  hasFieldError: jest.fn(),
  getFieldError: jest.fn(),
}));

const TestWrapper = ({ errors = {} }: { errors?: any }) => {
  const { register } = useForm();

  return <TaskDescriptionField register={register} errors={errors} />;
};

describe('TaskDescriptionField', () => {
  it('should render with default props', () => {
    render(<TestWrapper />);

    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Enter task description (optional)...')
    ).toBeInTheDocument();
  });

  it('should render with custom props', () => {
    const { register } = useForm();

    render(
      <TaskDescriptionField
        register={register}
        errors={{}}
        id="custom-description"
        className="custom-class"
        placeholder="Custom placeholder"
        rows={5}
      />
    );

    expect(screen.getByLabelText(/description/i)).toHaveAttribute(
      'id',
      'custom-description'
    );
    expect(
      screen.getByPlaceholderText('Custom placeholder')
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
  });

  it('should show error when field has error', () => {
    const { hasFieldError, getFieldError } = require('@/utils/formUtils');
    hasFieldError.mockReturnValue(true);
    getFieldError.mockReturnValue('Description is too long');

    render(
      <TestWrapper
        errors={{ description: { message: 'Description is too long' } }}
      />
    );

    expect(screen.getByText('Description is too long')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('border-red-500');
  });

  it('should not show error when field has no error', () => {
    const { hasFieldError, getFieldError } = require('@/utils/formUtils');
    hasFieldError.mockReturnValue(false);
    getFieldError.mockReturnValue(undefined);

    render(<TestWrapper />);

    expect(
      screen.queryByText('Description is too long')
    ).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).not.toHaveClass('border-red-500');
  });

  it('should be accessible', () => {
    render(<TestWrapper />);

    const textarea = screen.getByRole('textbox');
    const label = screen.getByLabelText(/description/i);

    expect(textarea).toHaveAttribute('id', 'description');
    expect(label).toHaveAttribute('for', 'description');
  });
});
