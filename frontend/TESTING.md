# Testing Documentation

## Overview

This project includes comprehensive tests for the task form functionality, covering form validation, submission, and component behavior.

## Test Structure

```
src/__tests__/
├── hooks/
│   └── useTaskForm.test.ts          # Tests for the useTaskForm hook
├── components/
│   ├── TaskTitleField.test.tsx      # Tests for title input field
│   ├── TaskDescriptionField.test.tsx # Tests for description textarea
│   ├── TaskPriorityField.test.tsx   # Tests for priority selector
│   └── TaskCreateDialogForm.test.tsx # Tests for dialog form
├── utils/
│   └── formUtils.test.ts            # Tests for utility functions
├── integration/
│   └── TaskFormIntegration.test.tsx # Integration tests
└── simple.test.ts                   # Basic Jest functionality test
```

## Test Coverage

### ✅ **Form Validation Tests**

- **Title validation**: Required field, length limits
- **Description validation**: Optional field, length limits
- **Priority validation**: Valid enum values
- **Due date validation**: Optional field

### ✅ **Form Submission Tests**

- **Successful submission**: Data transformation and API calls
- **Error handling**: Failed submissions with proper error messages
- **Loading states**: UI feedback during submission
- **Form reset**: Clean state after successful submission

### ✅ **Component Tests**

- **Field components**: Individual form field behavior
- **Error display**: Validation error rendering
- **Accessibility**: Proper labels and ARIA attributes
- **User interactions**: Click handlers and form updates

### ✅ **Utility Function Tests**

- **Data transformation**: Form data to API format
- **Priority helpers**: Color and display text functions
- **Error utilities**: Field error detection and messaging

## Running Tests

### All Tests

```bash
npm test
```

### Specific Test File

```bash
npm test -- --testPathPatterns=useTaskForm.test.ts
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

## Test Examples

### Form Validation Test

```typescript
it('should validate correct task data', () => {
  const validData = {
    title: 'Test Task',
    description: 'Test Description',
    dueDate: '2024-01-01T10:00',
    priority: 'high' as const,
  };

  const result = taskSchema.safeParse(validData);
  expect(result.success).toBe(true);
});
```

### Component Test

```typescript
it('should render with default props', () => {
  render(<TestWrapper />);

  expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Enter task title...')).toBeInTheDocument();
});
```

### Hook Test

```typescript
it('should handle form submission successfully', async () => {
  const { result } = renderHook(() => useTaskForm(mockOnTaskCreate));

  const formData = {
    title: 'Test Task',
    description: 'Test Description',
    dueDate: '2024-01-01T10:00',
    priority: 'high' as const,
  };

  await act(async () => {
    await result.current.onSubmit(formData);
  });

  expect(mockOnTaskCreate).toHaveBeenCalledWith({
    title: 'Test Task',
    description: 'Test Description',
    dueDate: new Date('2024-01-01T10:00'),
    priority: 'high',
  });
});
```

## Test Utilities

### Mock Functions

- **useTaskForm**: Mocked hook for testing components
- **transformFormDataToTask**: Mocked utility for data transformation
- **toast**: Mocked notification system
- **form utilities**: Mocked error handling functions

### Test Helpers

- **TestWrapper**: Wrapper component for testing form fields
- **Mock data**: Consistent test data across all tests
- **User interactions**: Simulated user events with @testing-library/user-event

## Key Test Scenarios

### 1. **Form Validation**

- ✅ Empty title should show error
- ✅ Title too long should show error
- ✅ Description too long should show error
- ✅ Invalid priority should show error
- ✅ Valid data should pass validation

### 2. **Form Submission**

- ✅ Successful submission with valid data
- ✅ Error handling for failed submissions
- ✅ Loading states during submission
- ✅ Form reset after successful submission

### 3. **Component Behavior**

- ✅ Form fields render correctly
- ✅ Error states display properly
- ✅ User interactions work as expected
- ✅ Accessibility attributes are present

### 4. **Data Transformation**

- ✅ Form data converts to API format
- ✅ Empty descriptions handled correctly
- ✅ Date strings converted to Date objects
- ✅ Priority values preserved correctly

## Configuration

### Jest Setup

- **Environment**: jsdom for DOM testing
- **Setup files**: jest.setup.js for global configuration
- **Module mapping**: @/ alias for imports
- **Test patterns**: Excludes .next/ and node_modules/

### Dependencies

- **@testing-library/react**: Component testing utilities
- **@testing-library/jest-dom**: Custom matchers
- **@testing-library/user-event**: User interaction simulation
- **jest**: Test runner and assertion library

## Best Practices

1. **Isolation**: Each test is independent and doesn't affect others
2. **Mocking**: External dependencies are properly mocked
3. **Coverage**: All critical paths are tested
4. **Readability**: Tests are clear and descriptive
5. **Maintainability**: Tests are easy to update when code changes

## Troubleshooting

### Common Issues

1. **Module resolution**: Ensure @/ alias is properly configured
2. **Mock setup**: Verify mocks are set up before tests run
3. **Async operations**: Use proper async/await patterns
4. **DOM cleanup**: Tests clean up after themselves

### Debug Tips

- Use `console.log` in tests to debug data flow
- Check mock function calls with `toHaveBeenCalledWith`
- Verify component state with `screen.debug()`
- Use `waitFor` for async operations
