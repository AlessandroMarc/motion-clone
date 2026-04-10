import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { GoogleCalendarEventForm } from '../GoogleCalendarEventForm';

// Mock the Google Calendar service
const mockCreateEvent = jest.fn();
const mockUpdateEvent = jest.fn();
jest.mock('@/services/googleCalendarService', () => ({
  googleCalendarService: {
    createEvent: (...args: unknown[]) => mockCreateEvent(...args),
    updateEvent: (...args: unknown[]) => mockUpdateEvent(...args),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type, disabled, ...rest }: any) => (
    <button onClick={onClick} type={type} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ id, value, onChange, type, ...rest }: any) => (
    <input id={id} value={value} onChange={onChange} type={type} {...rest} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ id, value, onChange, ...rest }: any) => (
    <textarea id={id} value={value} onChange={onChange} {...rest} />
  ),
}));

describe('GoogleCalendarEventForm', () => {
  const baseProps = {
    open: true,
    onOpenChange: jest.fn(),
    mode: 'create' as const,
    initialData: {
      startTime: '2026-04-10T14:00',
      endTime: '2026-04-10T15:00',
    },
    onSaved: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders create mode title', () => {
    render(<GoogleCalendarEventForm {...baseProps} />);
    expect(screen.getByText('New Google Calendar Event')).toBeInTheDocument();
  });

  it('renders edit mode title', () => {
    render(
      <GoogleCalendarEventForm
        {...baseProps}
        mode="edit"
        initialData={{
          title: 'Existing',
          startTime: '2026-04-10T14:00',
          endTime: '2026-04-10T15:00',
          googleEventId: 'evt-123',
        }}
      />
    );
    expect(screen.getByText('Edit Google Calendar Event')).toBeInTheDocument();
  });

  it('pre-fills form fields from initialData', () => {
    render(
      <GoogleCalendarEventForm
        {...baseProps}
        initialData={{
          title: 'Pre-filled',
          description: 'Some desc',
          startTime: '2026-04-10T14:00',
          endTime: '2026-04-10T15:00',
        }}
      />
    );

    const titleInput = screen.getByPlaceholderText('Event title') as HTMLInputElement;
    expect(titleInput.value).toBe('Pre-filled');

    const descInput = screen.getByPlaceholderText('Optional description') as HTMLTextAreaElement;
    expect(descInput.value).toBe('Some desc');
  });

  it('shows "Create Event" button in create mode', () => {
    render(<GoogleCalendarEventForm {...baseProps} />);
    expect(screen.getByText('Create Event')).toBeInTheDocument();
  });

  it('shows "Save Changes" button in edit mode', () => {
    render(
      <GoogleCalendarEventForm
        {...baseProps}
        mode="edit"
        initialData={{
          title: 'Test',
          startTime: '2026-04-10T14:00',
          endTime: '2026-04-10T15:00',
          googleEventId: 'evt-123',
        }}
      />
    );
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('calls createEvent on submit in create mode', async () => {
    mockCreateEvent.mockResolvedValue({ id: 'new-event' });
    const onSaved = jest.fn();

    render(
      <GoogleCalendarEventForm
        {...baseProps}
        onSaved={onSaved}
      />
    );

    // Fill in title
    const titleInput = screen.getByPlaceholderText('Event title');
    await userEvent.type(titleInput, 'New meeting');

    // Submit form
    const submitButton = screen.getByText('Create Event');
    await act(async () => {
      await userEvent.click(submitButton);
    });

    expect(mockCreateEvent).toHaveBeenCalledWith({
      title: 'New meeting',
      description: undefined,
      start_time: expect.any(String),
      end_time: expect.any(String),
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('calls updateEvent on submit in edit mode', async () => {
    mockUpdateEvent.mockResolvedValue({ id: 'updated-event' });
    const onSaved = jest.fn();

    render(
      <GoogleCalendarEventForm
        {...baseProps}
        mode="edit"
        initialData={{
          title: 'Old title',
          startTime: '2026-04-10T14:00',
          endTime: '2026-04-10T15:00',
          googleEventId: 'evt-123',
        }}
        onSaved={onSaved}
      />
    );

    // Clear and type new title
    const titleInput = screen.getByPlaceholderText('Event title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Updated title');

    const submitButton = screen.getByText('Save Changes');
    await act(async () => {
      await userEvent.click(submitButton);
    });

    expect(mockUpdateEvent).toHaveBeenCalledWith('evt-123', {
      title: 'Updated title',
      description: undefined,
      start_time: expect.any(String),
      end_time: expect.any(String),
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    const onOpenChange = jest.fn();
    render(
      <GoogleCalendarEventForm {...baseProps} onOpenChange={onOpenChange} />
    );

    const cancelButton = screen.getByText('Cancel');
    await userEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not render when open is false', () => {
    render(<GoogleCalendarEventForm {...baseProps} open={false} />);
    expect(screen.queryByText('New Google Calendar Event')).not.toBeInTheDocument();
  });

  it('shows error toast when createEvent fails', async () => {
    const { toast } = require('sonner');
    mockCreateEvent.mockRejectedValue(new Error('Network error'));

    render(<GoogleCalendarEventForm {...baseProps} />);

    const titleInput = screen.getByPlaceholderText('Event title');
    await userEvent.type(titleInput, 'Test event');

    const submitButton = screen.getByText('Create Event');
    await act(async () => {
      await userEvent.click(submitButton);
    });

    expect(toast.error).toHaveBeenCalledWith('Network error');
  });

  it('does not call createEvent when title is empty on submit', async () => {
    render(<GoogleCalendarEventForm {...baseProps} />);

    // Submit without filling title — the form-level check prevents the API call
    const submitButton = screen.getByText('Create Event');
    await act(async () => {
      await userEvent.click(submitButton);
    });

    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  it('renders Cancel and Submit buttons', () => {
    render(<GoogleCalendarEventForm {...baseProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Create Event')).toBeInTheDocument();
  });

  it('renders form fields with correct labels', () => {
    render(<GoogleCalendarEventForm {...baseProps} />);
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('End')).toBeInTheDocument();
  });
});
