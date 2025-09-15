# Task Components - Modular Architecture

This directory contains a modular, maintainable structure for task-related components with clear separation of concerns.

## Architecture Overview

### 🏗️ Structure

```
Tasks/
├── forms/                    # Form-specific components
│   ├── TaskTitleField.tsx    # Reusable title input field
│   ├── TaskDescriptionField.tsx # Reusable description textarea
│   ├── TaskDueDateField.tsx  # Reusable due date input
│   ├── TaskPriorityField.tsx # Reusable priority selector
│   ├── TaskFormActions.tsx   # Reusable form action buttons
│   ├── TaskCreateDialogForm.tsx # Dialog-based form
│   ├── TaskCreateCardForm.tsx   # Card-based form
│   └── index.ts              # Barrel exports
├── TaskCreateForm.tsx        # Main form component (wrapper)
├── TaskList.tsx             # Task list display component
└── README.md               # This file
```

### 🎯 Design Principles

1. **Separation of Concerns**: Logic is separated from UI components
2. **Reusability**: Form fields can be used in different contexts
3. **Maintainability**: Each component has a single responsibility
4. **Type Safety**: Full TypeScript support with proper interfaces
5. **Consistency**: Shared utilities ensure consistent behavior

## Components

### Form Field Components

#### `TaskTitleField`

- **Purpose**: Handles title input with validation
- **Props**: `register`, `errors`, `id`, `className`, `placeholder`
- **Features**: Required field validation, error display

#### `TaskDescriptionField`

- **Purpose**: Handles description textarea with validation
- **Props**: `register`, `errors`, `id`, `className`, `placeholder`, `rows`
- **Features**: Optional field, character limit validation

#### `TaskDueDateField`

- **Purpose**: Handles due date input with calendar icon
- **Props**: `register`, `errors`, `id`, `className`
- **Features**: DateTime input, visual calendar indicator

#### `TaskPriorityField`

- **Purpose**: Handles priority selection with visual indicators
- **Props**: `value`, `onValueChange`, `errors`, `id`, `className`, `placeholder`
- **Features**: Color-coded options, validation

#### `TaskFormActions`

- **Purpose**: Reusable form action buttons
- **Props**: `isSubmitting`, `onCancel`, `submitText`, `cancelText`, `className`
- **Features**: Loading states, customizable text

### Complete Form Components

#### `TaskCreateDialogForm`

- **Purpose**: Modal dialog for task creation
- **Features**: Full form with all fields, modal behavior

#### `TaskCreateCardForm`

- **Purpose**: Inline card for task creation
- **Features**: Expandable card, compact layout

## Hooks

### `useTaskForm`

- **Location**: `@/hooks/useTaskForm`
- **Purpose**: Centralized form logic and state management
- **Returns**: Form methods, validation, submission handling
- **Features**:
  - Form validation with Zod
  - Error handling
  - Loading states
  - Data transformation

## Utilities

### `formUtils`

- **Location**: `@/utils/formUtils`
- **Purpose**: Shared utility functions for form handling
- **Functions**:
  - `transformFormDataToTask()`: Converts form data to API format
  - `getPriorityColor()`: Returns CSS class for priority colors
  - `getPriorityDisplayText()`: Returns display text for priorities
  - `hasFieldError()`: Checks if field has validation error
  - `getFieldError()`: Gets error message for field

## Usage Examples

### Basic Form Usage

```tsx
import { TaskCreateForm } from '@/components/Tasks/TaskCreateForm';

function MyComponent() {
  const handleTaskCreate = async taskData => {
    // Handle task creation
  };

  return <TaskCreateForm onTaskCreate={handleTaskCreate} />;
}
```

### Using Individual Form Fields

```tsx
import { TaskTitleField, TaskDescriptionField } from '@/components/Tasks/forms';
import { useTaskForm } from '@/hooks/useTaskForm';

function CustomForm() {
  const { register, errors, handleSubmit, onSubmit } =
    useTaskForm(handleCreate);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <TaskTitleField register={register} errors={errors} />
      <TaskDescriptionField register={register} errors={errors} />
      {/* ... other fields */}
    </form>
  );
}
```

### Using Form Utilities

```tsx
import { getPriorityColor, transformFormDataToTask } from '@/utils/formUtils';

// Get priority color class
const colorClass = getPriorityColor('high'); // 'bg-red-500'

// Transform form data
const taskData = transformFormDataToTask(formData);
```

## Benefits

1. **Modularity**: Components can be used independently
2. **Reusability**: Form fields work in any context
3. **Maintainability**: Changes to one component don't affect others
4. **Testability**: Each component can be tested in isolation
5. **Consistency**: Shared utilities ensure uniform behavior
6. **Type Safety**: Full TypeScript support prevents runtime errors
7. **Performance**: Smaller bundle sizes due to tree-shaking

## Future Enhancements

- Add form field animations
- Implement custom validation rules
- Add accessibility improvements
- Create form field variants (compact, detailed)
- Add form state persistence
- Implement form field dependencies
