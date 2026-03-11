import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { GoogleCalendarSettings } from '../GoogleCalendarSettings';
import { googleCalendarService } from '@/services/googleCalendarService';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/useOnboarding';

jest.mock('@/services/googleCalendarService');
jest.mock('@/contexts/AuthContext');
jest.mock('@/hooks/useOnboarding');
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

// default auth stub
(useAuth as jest.Mock).mockReturnValue({ user: { id: 'user-1' } });
(useOnboarding as jest.Mock).mockReturnValue({
  advanceToNextStep: jest.fn(),
  status: null,
});

describe('GoogleCalendarSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens reconnect dialog when sync returns invalid_grant', async () => {
    (googleCalendarService.getStatus as jest.Mock).mockResolvedValue({
      connected: true,
      last_synced_at: null,
    });
    (googleCalendarService.sync as jest.Mock).mockResolvedValue({
      synced: 0,
      errors: ['google_calendar_invalid_grant', 'Please reconnect'],
      durationMs: 0,
      filtered: { count: 0, events: [] },
    });

    const { getByText, queryByText } = render(<GoogleCalendarSettings />);

    // Wait for status load
    await waitFor(() => {
      expect(googleCalendarService.getStatus).toHaveBeenCalledWith('user-1');
    });

    // click sync button
    const syncButton = getByText(/sync now/i);
    fireEvent.click(syncButton);

    // dialog should appear
    await waitFor(() => {
      expect((getByText(/authorization expired/i) as any).toBeInTheDocument());
    });

    // clicking dismiss should close it
    const dismiss = getByText(/dismiss/i);
    fireEvent.click(dismiss);
    await waitFor(() => {
      expect((queryByText(/authorization expired/i) as any).not.toBeInTheDocument());
    });
  });
});
