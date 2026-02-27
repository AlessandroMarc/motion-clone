import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Task } from '@/types';
import { KanbanTaskCard } from '../KanbanTaskCard';

jest.mock('lucide-react', () => ({
  Trash2: () => <span data-testid="trash-icon" />,
  Calendar: () => <span data-testid="calendar-icon" />,
  CalendarPlus: () => <span data-testid="calendar-plus-icon" />,
  CalendarCheck: () => <span data-testid="calendar-check-icon" />,
  GripVertical: () => <span data-testid="grip-icon" />,
  AlertCircle: () => <span data-testid="alert-icon" />,
  AlertTriangle: () => <span data-testid="alert-triangle-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  Folder: () => <span data-testid="folder-icon" />,
  CheckCircle2: () => <span data-testid="check-icon" />,
  Circle: () => <span data-testid="circle-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick, draggable, onDragStart }: any) => (
    <div
      data-testid="card"
      className={className}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, title }: any) => (
    <button onClick={onClick} className={className} title={title}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span className={className}>{children}</span>
  ),
}));

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test Task',
  description: '',
  due_date: null,
  priority: 'medium',
  status: 'not-started',
  dependencies: [],
  blockedBy: [],
  user_id: 'user-1',
  created_at: new Date(),
  updated_at: new Date(),
  planned_duration_minutes: 60,
  actual_duration_minutes: 0,
  ...overrides,
});

describe('KanbanTaskCard', () => {
  it('renders task title', () => {
    render(
      <KanbanTaskCard task={makeTask({ title: 'My Task' })} onDelete={jest.fn()} />
    );
    expect(screen.getByText('My Task')).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = jest.fn();
    render(<KanbanTaskCard task={makeTask()} onDelete={onDelete} />);
    const deleteBtn = screen.getByTitle('Delete task');
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith('task-1');
  });

  it('calls onSelect when card is clicked', () => {
    const onSelect = jest.fn();
    const task = makeTask();
    render(
      <KanbanTaskCard task={task} onDelete={jest.fn()} onSelect={onSelect} />
    );
    fireEvent.click(screen.getByTestId('card'));
    expect(onSelect).toHaveBeenCalledWith(task);
  });

  it('shows completed styling when task is completed', () => {
    const task = makeTask({ status: 'completed' });
    render(<KanbanTaskCard task={task} onDelete={jest.fn()} />);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('opacity-60');
  });

  it('does not show completed styling for non-completed task', () => {
    const task = makeTask({ status: 'not-started' });
    render(<KanbanTaskCard task={task} onDelete={jest.fn()} />);
    const card = screen.getByTestId('card');
    expect(card.className).not.toContain('opacity-60');
  });

  it('shows "Scheduled" when isPlanned is true', () => {
    render(
      <KanbanTaskCard task={makeTask()} onDelete={jest.fn()} isPlanned={true} />
    );
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('does not show "Scheduled" when isPlanned is false', () => {
    render(
      <KanbanTaskCard task={makeTask()} onDelete={jest.fn()} isPlanned={false} />
    );
    expect(screen.queryByText('Scheduled')).not.toBeInTheDocument();
  });

  it('shows delete button when onDelete is provided', () => {
    render(<KanbanTaskCard task={makeTask()} onDelete={jest.fn()} />);
    expect(screen.getByTitle('Delete task')).toBeInTheDocument();
  });

  it('renders priority indicator text', () => {
    render(<KanbanTaskCard task={makeTask({ priority: 'high' })} onDelete={jest.fn()} />);
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('renders due date when present', () => {
    const task = makeTask({ due_date: new Date('2099-01-15') });
    render(<KanbanTaskCard task={task} onDelete={jest.fn()} />);
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
  });

  it('does not show onSelect cursor class when onSelect not provided', () => {
    render(<KanbanTaskCard task={makeTask()} onDelete={jest.fn()} />);
    const card = screen.getByTestId('card');
    expect(card.className).not.toContain('cursor-pointer');
  });

  it('applies cursor-pointer class when onSelect is provided', () => {
    render(
      <KanbanTaskCard task={makeTask()} onDelete={jest.fn()} onSelect={jest.fn()} />
    );
    const card = screen.getByTestId('card');
    expect(card.className).toContain('cursor-pointer');
  });
});
