import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock serviceRoleSupabase BEFORE importing anything that uses it
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockUpsert = jest.fn();
const mockEq = jest.fn();
const mockLte = jest.fn();
const mockOrder = jest.fn();

jest.unstable_mockModule('../../config/supabase.js', () => ({
  serviceRoleSupabase: {
    from: mockFrom,
  },
}));

// Mock ResendService
const mockSendEmail = jest.fn();
jest.unstable_mockModule('../resendService.js', () => ({
  ResendService: jest.fn().mockImplementation(() => ({
    sendEmail: mockSendEmail,
  })),
}));

const { OnboardingEmailService, ONBOARDING_EMAIL_COUNT } =
  await import('../onboardingEmailService.js');
const { ResendService } = await import('../resendService.js');

// Helper: configure the supabase mock chain for a single call
function setupSupabaseMock(returnValue: unknown) {
  const lteChain = {
    lte: jest.fn().mockResolvedValue(returnValue),
  };
  const eqChain = {
    eq: jest.fn().mockReturnValue(lteChain),
  };
  const chain = {
    select: jest.fn().mockReturnValue(eqChain),
    upsert: jest.fn().mockResolvedValue(returnValue),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue(returnValue),
    }),
    order: jest.fn().mockResolvedValue(returnValue),
    eq: jest.fn().mockReturnValue(lteChain),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

describe('OnboardingEmailService', () => {
  let service: InstanceType<typeof OnboardingEmailService>;
  let mockResendService: { sendEmail: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockResendService = { sendEmail: mockSendEmail };
    // Pass mock ResendService directly to avoid needing RESEND_API_KEY
    service = new OnboardingEmailService(mockResendService as any);
  });

  describe('ONBOARDING_EMAIL_COUNT', () => {
    test('should equal 3', () => {
      expect(ONBOARDING_EMAIL_COUNT).toBe(3);
    });
  });

  describe('startSequence', () => {
    test('should insert 3 email rows into the database', async () => {
      const chain = setupSupabaseMock({ data: [], error: null });

      await service.startSequence('user-123', 'test@example.com');

      expect(mockFrom).toHaveBeenCalledWith('onboarding_email_sequence');
      expect(chain.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ email_number: 1, status: 'pending' }),
          expect.objectContaining({ email_number: 2, status: 'pending' }),
          expect.objectContaining({ email_number: 3, status: 'pending' }),
        ]),
        expect.objectContaining({ onConflict: 'user_id,email_number' })
      );
    });

    test('should schedule email_number 1 for today', async () => {
      const chain = setupSupabaseMock({ data: [], error: null });

      const before = new Date();
      await service.startSequence('user-123', 'test@example.com');
      const after = new Date();

      const calls = chain.upsert.mock.calls[0] as any[];
      const rows = calls[0] as Array<{
        email_number: number;
        scheduled_for: string;
      }>;

      const day1 = rows.find(r => r.email_number === 1)!;
      const scheduledDate = new Date(day1.scheduled_for);
      // Should be within the window of the test run
      expect(scheduledDate.getTime()).toBeGreaterThanOrEqual(
        before.getTime() - 1000
      );
      expect(scheduledDate.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    test('should schedule email_number 2 for tomorrow', async () => {
      const chain = setupSupabaseMock({ data: [], error: null });

      await service.startSequence('user-123', 'test@example.com');

      const calls = chain.upsert.mock.calls[0] as any[];
      const rows = calls[0] as Array<{
        email_number: number;
        scheduled_for: string;
      }>;

      const day1 = rows.find(r => r.email_number === 1)!;
      const day2 = rows.find(r => r.email_number === 2)!;
      const diff =
        new Date(day2.scheduled_for).getTime() -
        new Date(day1.scheduled_for).getTime();

      expect(diff).toBeCloseTo(24 * 60 * 60 * 1000, -4);
    });

    test('should throw when database insert fails', async () => {
      setupSupabaseMock({ data: null, error: { message: 'DB error' } });

      await expect(
        service.startSequence('user-123', 'test@example.com')
      ).rejects.toThrow('Failed to schedule onboarding emails');
    });
  });

  describe('processPendingEmails', () => {
    test('should return zeros when no pending emails exist', async () => {
      const chain = {
        from: mockFrom,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lte: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await service.processPendingEmails();

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    test('should send pending emails and mark them as sent', async () => {
      const pendingEmail = {
        id: 'email-row-1',
        user_id: 'user-123',
        email: 'test@example.com',
        email_number: 1,
        scheduled_for: new Date(Date.now() - 1000).toISOString(),
        sent_at: null,
        status: 'pending',
        error_message: null,
      };

      // Mock the fetch call
      const updateEqMock = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lte: jest
          .fn()
          .mockResolvedValue({ data: [pendingEmail], error: null }),
        update: updateMock,
      };
      mockFrom.mockReturnValue(chain);

      mockSendEmail.mockResolvedValue({ success: true, messageId: 'msg-1' });

      const result = await service.processPendingEmails();

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'sent' })
      );
    });

    test('should mark emails as failed when send fails', async () => {
      const pendingEmail = {
        id: 'email-row-1',
        user_id: 'user-123',
        email: 'test@example.com',
        email_number: 1,
        scheduled_for: new Date(Date.now() - 1000).toISOString(),
        sent_at: null,
        status: 'pending',
        error_message: null,
      };

      const updateEqMock = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lte: jest
          .fn()
          .mockResolvedValue({ data: [pendingEmail], error: null }),
        update: updateMock,
      };
      mockFrom.mockReturnValue(chain);

      mockSendEmail.mockResolvedValue({
        success: false,
        error: 'Invalid API key',
      });

      const result = await service.processPendingEmails();

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid API key');
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed' })
      );
    });

    test('should throw when DB fetch fails', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lte: jest
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      };
      mockFrom.mockReturnValue(chain);

      await expect(service.processPendingEmails()).rejects.toThrow(
        'Failed to fetch pending onboarding emails'
      );
    });
  });

  describe('getSequenceStatus', () => {
    test('should return sequence rows ordered by email_number', async () => {
      const rows = [
        { id: '1', email_number: 1, status: 'sent' },
        { id: '2', email_number: 2, status: 'pending' },
        { id: '3', email_number: 3, status: 'pending' },
      ];

      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: rows, error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await service.getSequenceStatus('user-123');

      expect(result).toEqual(rows);
      expect(chain.order).toHaveBeenCalledWith('email_number', {
        ascending: true,
      });
    });

    test('should throw when DB fetch fails', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      };
      mockFrom.mockReturnValue(chain);

      await expect(service.getSequenceStatus('user-123')).rejects.toThrow(
        'Failed to fetch onboarding email status'
      );
    });
  });
});
