import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { WeekCalendarContainer } from '../WeekCalendarContainer';
import { googleCalendarService } from '@/services/googleCalendarService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

jest.mock('@/services/googleCalendarService');
jest.mock('@/contexts/AuthContext');
jest.mock('@/components/Tasks/forms/TaskCreateDialogForm', () => ({
  TaskCreateDialogForm: () => null,
}));
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(() => false),
}));
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

// Provide a minimal auth context stub
(useAuth as jest.Mock).mockReturnValue({
  user: { id: 'user-1' },
  activeSchedule: null,
});

const mockStatus = { connected: true, last_synced_at: null };

// stub out various calendar hooks used by the component
jest.mock('../hooks', () => ({
  useAutoSchedule: jest.fn(() => ({
    tasksMap: new Map(),
    handleAutoScheduleClick: jest.fn(),
    isRefreshing: false,
  })),
  useCalendarDialogs: jest.fn(() => ({
    editOpen: false,
    setEditOpen: jest.fn(),
    editTitle: '',
    editDescription: '',
    editStartTime: '',
    editEndTime: '',
    editEvent: null,
    editCompleted: false,
    handleUpdateCompletion: jest.fn(),
    completionChoiceOpen: false,
    setCompletionChoiceOpen: jest.fn(),
    completionChoiceSessionCount: 0,
    completionChoiceIsRecurring: false,
    handleCompletionChoice: jest.fn(),
    choiceDialogOpen: false,
    setChoiceDialogOpen: jest.fn(),
    handleGridCellClick: jest.fn(),
    getSlotLabel: jest.fn(),
    handleChooseTask: jest.fn(),
    handleChooseGoogleEvent: jest.fn(),
    taskCreateFromCalendarOpen: false,
    setTaskCreateFromCalendarOpen: jest.fn(),
    googleEventFormOpen: false,
    setGoogleEventFormOpen: jest.fn(),
    googleEventFormMode: 'create',
    googleEventFormData: null,
    handleGoogleEventSaved: jest.fn(),
    handleEditGoogleEvent: jest.fn(),
    handleDeleteGoogleEvent: jest.fn(),
    handleDeleteEdit: jest.fn(),
    clickedSlot: null,
  })),
  useCalendarEvents: jest.fn(() => ({
    events: [],
    setEvents: jest.fn(),
    eventsByDay: {},
    allDaySyncedEvents: [],
    loading: false,
    error: null,
    refreshEvents: jest.fn().mockResolvedValue([]),
  })),
  useEventDragAndDrop: jest.fn(() => ({})),
  useExternalTaskDrag: jest.fn(() => ({})),
  useExternalTaskDrop: jest.fn(() => ({})),
}));

jest.mock('..', () => ({
  useWeekCalendarNavigation: jest.fn(() => ({
    currentDay: new Date(),
    currentDateKey: new Date().toISOString().slice(0, 10),
  })),
}));

describe('WeekCalendarContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prompts user to reconnect when Google sync returns invalid_grant', async () => {
    (googleCalendarService.getStatus as jest.Mock).mockResolvedValue(
      mockStatus
    );
    (googleCalendarService.sync as jest.Mock).mockResolvedValue({
      synced: 0,
      errors: ['google_calendar_invalid_grant', 'Please reconnect'],
      durationMs: 0,
      filtered: { count: 0, events: [] },
    });

    render(<WeekCalendarContainer />);

    await waitFor(() => {
      expect(googleCalendarService.sync).toHaveBeenCalledWith('user-1');
    });

    // toast should have been triggered to notify user
    expect(toast.error).toHaveBeenCalled();
  });
});
