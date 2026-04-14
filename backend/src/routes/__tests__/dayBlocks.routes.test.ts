import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { Express } from 'express';

// ── mock modules BEFORE any dynamic import ────────────────────────────────────
jest.unstable_mockModule('../../config/supabase.js', () => ({
  supabase: {},
  serviceRoleSupabase: {},
  getAuthenticatedSupabase: jest.fn().mockReturnValue({}),
  verifyAuthToken: jest
    .fn()
    .mockReturnValue({ userId: 'user-1', exp: 9999999999 }),
}));

const mockCalendarEventService = {
  getCalendarEventById: jest.fn(),
  deleteCalendarEvent: jest.fn(),
  createCalendarEvent: jest.fn(),
  getAllCalendarEvents: jest.fn(),
};
jest.unstable_mockModule('../../services/calendarEventService.js', () => ({
  CalendarEventService: jest
    .fn()
    .mockImplementation(() => mockCalendarEventService),
}));

const mockAutoScheduleService = {
  run: jest.fn(),
};
jest.unstable_mockModule('../../services/autoScheduleService.js', () => ({
  AutoScheduleService: jest
    .fn()
    .mockImplementation(() => mockAutoScheduleService),
}));

const mockDayBlockService = {
  resolveTimes: jest.fn(),
  findOverlappingDayBlock: jest.fn(),
  simulate: jest.fn(),
  create: jest.fn(),
};
jest.unstable_mockModule('../../services/dayBlockService.js', () => ({
  DayBlockService: jest.fn().mockImplementation(() => mockDayBlockService),
  buildLocalDateTime: jest
    .fn()
    .mockImplementation((dateStr: string, timeStr: string) => {
      const [y, m, d] = (dateStr as string).split('-').map(Number);
      const [h, min] = (timeStr as string).split(':').map(Number);
      return new Date(y!, m! - 1, d!, h!, min!, 0, 0);
    }),
}));

// ── dynamic imports after mocks ───────────────────────────────────────────────
const { default: supertest } = await import('supertest');
const { default: express } = await import('express');
const { default: dayBlockRouter } = await import('../dayBlocks.js');

const app: Express = express();
app.use(express.json());
app.use('/api/day-blocks', dayBlockRouter);

const AUTH_HEADER = { Authorization: 'Bearer fake-test-token' };

const sampleSimulateResult = {
  tasksToMove: [],
  totalEventsCreated: 0,
  totalEventsDeleted: 0,
  violations: 0,
  blockEndTime: '2026-04-13T18:00:00.000Z',
  isNonWorkingDay: false,
};

const sampleDayBlock = {
  id: 'db-1',
  title: 'Day blocked',
  start_time: '2026-04-13T09:00:00.000Z',
  end_time: '2026-04-13T18:00:00.000Z',
  user_id: 'user-1',
  is_day_block: true,
};

const sampleScheduleResult = {
  unchanged: false,
  eventsCreated: 2,
  eventsDeleted: 2,
  violations: 0,
};

const validTimes = {
  startTime: new Date('2026-04-13T09:00:00'),
  endTime: new Date('2026-04-13T18:00:00'),
  isNonWorkingDay: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── POST /api/day-blocks/preview ───────────────────────────────────────────────
describe('POST /api/day-blocks/preview', () => {
  test('returns preview for a valid request', async () => {
    mockDayBlockService.resolveTimes.mockResolvedValue(validTimes);
    mockDayBlockService.simulate.mockResolvedValue(sampleSimulateResult);

    const res = await supertest(app)
      .post('/api/day-blocks/preview')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13', from_time: '09:00' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.blockEndTime).toBeDefined();
    expect(res.body.data.isNonWorkingDay).toBe(false);
    expect(mockDayBlockService.simulate).toHaveBeenCalledTimes(1);
  });

  test('returns 400 when date is missing', async () => {
    const res = await supertest(app)
      .post('/api/day-blocks/preview')
      .set(AUTH_HEADER)
      .send({ from_time: '09:00' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when from_time is missing', async () => {
    const res = await supertest(app)
      .post('/api/day-blocks/preview')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when working day is already over', async () => {
    mockDayBlockService.resolveTimes.mockResolvedValue({
      error: 'The chosen time is at or after the end of your working hours',
    });

    const res = await supertest(app)
      .post('/api/day-blocks/preview')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13', from_time: '19:00' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 without auth header', async () => {
    const res = await supertest(app)
      .post('/api/day-blocks/preview')
      .send({ date: '2026-04-13', from_time: '09:00' });

    expect(res.status).toBe(401);
  });

  test('includes isNonWorkingDay flag in response', async () => {
    mockDayBlockService.resolveTimes.mockResolvedValue({
      ...validTimes,
      isNonWorkingDay: true,
    });
    mockDayBlockService.simulate.mockResolvedValue({
      ...sampleSimulateResult,
      isNonWorkingDay: true,
    });

    const res = await supertest(app)
      .post('/api/day-blocks/preview')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13', from_time: '09:00' });

    expect(res.status).toBe(200);
    expect(res.body.data.isNonWorkingDay).toBe(true);
  });

  test('returns 500 when service throws', async () => {
    mockDayBlockService.resolveTimes.mockResolvedValue(validTimes);
    mockDayBlockService.simulate.mockRejectedValue(new Error('DB error'));

    const res = await supertest(app)
      .post('/api/day-blocks/preview')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13', from_time: '09:00' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when date format is malformed (not YYYY-MM-DD)', async () => {
    const res = await supertest(app)
      .post('/api/day-blocks/preview')
      .set(AUTH_HEADER)
      .send({ date: '04/13/2026', from_time: '09:00' });
    expect(res.status).toBe(400);
    expect(mockDayBlockService.simulate).not.toHaveBeenCalled();
  });

  test('returns 400 when from_time format is malformed (not HH:MM)', async () => {
    const res = await supertest(app)
      .post('/api/day-blocks/preview')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13', from_time: '9am' });
    expect(res.status).toBe(400);
    expect(mockDayBlockService.simulate).not.toHaveBeenCalled();
  });

  test('returns 400 with empty body', async () => {
    const res = await supertest(app)
      .post('/api/day-blocks/preview')
      .set(AUTH_HEADER)
      .send({});
    expect(res.status).toBe(400);
  });

  test('preview passes isNonWorkingDay through to service call', async () => {
    mockDayBlockService.resolveTimes.mockResolvedValue({
      ...validTimes,
      isNonWorkingDay: true,
    });
    mockDayBlockService.simulate.mockResolvedValue({
      ...sampleSimulateResult,
      isNonWorkingDay: true,
    });

    await supertest(app)
      .post('/api/day-blocks/preview')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13', from_time: '09:00' });

    // Last arg to simulate() should be `true` (the isNonWorkingDay flag)
    const call = mockDayBlockService.simulate.mock.calls[0];
    expect(call[call.length - 1]).toBe(true);
  });
});

// ── POST /api/day-blocks ───────────────────────────────────────────────────────
describe('POST /api/day-blocks', () => {
  test('creates a day block and returns 200', async () => {
    mockDayBlockService.resolveTimes.mockResolvedValue(validTimes);
    mockDayBlockService.findOverlappingDayBlock.mockResolvedValue(null);
    mockDayBlockService.create.mockResolvedValue({
      dayBlock: sampleDayBlock,
      scheduleResult: sampleScheduleResult,
    });

    const res = await supertest(app)
      .post('/api/day-blocks')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13', from_time: '09:00' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.day_block.id).toBe('db-1');
    expect(res.body.data.schedule_result.eventsCreated).toBe(2);
  });

  test('returns 409 when an overlapping day block already exists', async () => {
    mockDayBlockService.resolveTimes.mockResolvedValue(validTimes);
    mockDayBlockService.findOverlappingDayBlock.mockResolvedValue(
      sampleDayBlock
    );

    const res = await supertest(app)
      .post('/api/day-blocks')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13', from_time: '09:00' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(mockDayBlockService.create).not.toHaveBeenCalled();
  });

  test('returns 400 when date is missing', async () => {
    const res = await supertest(app)
      .post('/api/day-blocks')
      .set(AUTH_HEADER)
      .send({ from_time: '09:00' });

    expect(res.status).toBe(400);
  });

  test('returns 400 when from_time is missing', async () => {
    const res = await supertest(app)
      .post('/api/day-blocks')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13' });

    expect(res.status).toBe(400);
  });

  test('returns 400 when working day already over', async () => {
    mockDayBlockService.resolveTimes.mockResolvedValue({
      error: 'The chosen time is at or after the end of your working hours',
    });

    const res = await supertest(app)
      .post('/api/day-blocks')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13', from_time: '19:00' });

    expect(res.status).toBe(400);
  });

  test('returns 401 without auth header', async () => {
    const res = await supertest(app)
      .post('/api/day-blocks')
      .send({ date: '2026-04-13', from_time: '09:00' });

    expect(res.status).toBe(401);
  });

  test('returns 500 when service throws', async () => {
    mockDayBlockService.resolveTimes.mockResolvedValue(validTimes);
    mockDayBlockService.findOverlappingDayBlock.mockResolvedValue(null);
    mockDayBlockService.create.mockRejectedValue(new Error('DB error'));

    const res = await supertest(app)
      .post('/api/day-blocks')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13', from_time: '09:00' });

    expect(res.status).toBe(500);
  });

  test('does not run overlap check when resolveTimes fails', async () => {
    mockDayBlockService.resolveTimes.mockResolvedValue({ error: 'nope' });

    await supertest(app)
      .post('/api/day-blocks')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13', from_time: '20:00' });

    expect(mockDayBlockService.findOverlappingDayBlock).not.toHaveBeenCalled();
    expect(mockDayBlockService.create).not.toHaveBeenCalled();
  });

  test('returns 500 when overlap check throws', async () => {
    mockDayBlockService.resolveTimes.mockResolvedValue(validTimes);
    mockDayBlockService.findOverlappingDayBlock.mockRejectedValue(
      new Error('overlap-check-failed')
    );

    const res = await supertest(app)
      .post('/api/day-blocks')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13', from_time: '09:00' });

    expect(res.status).toBe(500);
  });
});

// ── DELETE /api/day-blocks/:id ─────────────────────────────────────────────────
describe('DELETE /api/day-blocks/:id', () => {
  test('deletes a day block and re-runs auto-schedule', async () => {
    mockCalendarEventService.getCalendarEventById.mockResolvedValue(
      sampleDayBlock
    );
    mockCalendarEventService.deleteCalendarEvent.mockResolvedValue(true);
    mockAutoScheduleService.run.mockResolvedValue(sampleScheduleResult);

    const res = await supertest(app)
      .delete('/api/day-blocks/db-1')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockCalendarEventService.deleteCalendarEvent).toHaveBeenCalledWith(
      'db-1',
      'fake-test-token'
    );
    expect(mockAutoScheduleService.run).toHaveBeenCalledTimes(1);
  });

  test('returns 404 when event does not exist', async () => {
    mockCalendarEventService.getCalendarEventById.mockResolvedValue(null);

    const res = await supertest(app)
      .delete('/api/day-blocks/missing')
      .set(AUTH_HEADER);

    expect(res.status).toBe(404);
    expect(mockCalendarEventService.deleteCalendarEvent).not.toHaveBeenCalled();
  });

  test('returns 400 when event is not a day block', async () => {
    mockCalendarEventService.getCalendarEventById.mockResolvedValue({
      id: 'evt-1',
      title: 'Regular event',
      is_day_block: false,
    });

    const res = await supertest(app)
      .delete('/api/day-blocks/evt-1')
      .set(AUTH_HEADER);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockCalendarEventService.deleteCalendarEvent).not.toHaveBeenCalled();
  });

  test('returns 401 without auth header', async () => {
    const res = await supertest(app).delete('/api/day-blocks/db-1');
    expect(res.status).toBe(401);
  });

  test('returns 500 when delete service throws', async () => {
    mockCalendarEventService.getCalendarEventById.mockResolvedValue(
      sampleDayBlock
    );
    mockCalendarEventService.deleteCalendarEvent.mockRejectedValue(
      new Error('DB error')
    );

    const res = await supertest(app)
      .delete('/api/day-blocks/db-1')
      .set(AUTH_HEADER);

    expect(res.status).toBe(500);
  });

  test('does not run auto-schedule when event is not a day block', async () => {
    mockCalendarEventService.getCalendarEventById.mockResolvedValue({
      id: 'evt-1',
      is_day_block: false,
    });

    await supertest(app).delete('/api/day-blocks/evt-1').set(AUTH_HEADER);

    expect(mockAutoScheduleService.run).not.toHaveBeenCalled();
    expect(mockCalendarEventService.deleteCalendarEvent).not.toHaveBeenCalled();
  });

  test('does not run auto-schedule when event is missing', async () => {
    mockCalendarEventService.getCalendarEventById.mockResolvedValue(null);

    await supertest(app).delete('/api/day-blocks/nope').set(AUTH_HEADER);

    expect(mockAutoScheduleService.run).not.toHaveBeenCalled();
  });
});

// ── Full-flow integration: preview → create → delete ──────────────────────
describe('Full flow: preview → create → delete', () => {
  test('a user can preview, create, then delete a day block', async () => {
    mockDayBlockService.resolveTimes.mockResolvedValue(validTimes);
    mockDayBlockService.simulate.mockResolvedValue({
      ...sampleSimulateResult,
      tasksToMove: [
        {
          task: { id: 'task-1', title: 'Write tests' },
          currentEvent: { id: 'evt-1', linked_task_id: 'task-1' },
          proposedTime: null,
        },
      ],
      totalEventsCreated: 1,
      totalEventsDeleted: 1,
    });
    mockDayBlockService.findOverlappingDayBlock.mockResolvedValue(null);
    mockDayBlockService.create.mockResolvedValue({
      dayBlock: sampleDayBlock,
      scheduleResult: sampleScheduleResult,
    });
    mockCalendarEventService.getCalendarEventById.mockResolvedValue(
      sampleDayBlock
    );
    mockCalendarEventService.deleteCalendarEvent.mockResolvedValue(true);
    mockAutoScheduleService.run.mockResolvedValue(sampleScheduleResult);

    // 1. Preview
    const previewRes = await supertest(app)
      .post('/api/day-blocks/preview')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13', from_time: '09:00' });
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.data.tasksToMove).toHaveLength(1);

    // 2. Create
    const createRes = await supertest(app)
      .post('/api/day-blocks')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13', from_time: '09:00' });
    expect(createRes.status).toBe(200);
    expect(createRes.body.data.day_block.id).toBe('db-1');

    // 3. Delete
    const deleteRes = await supertest(app)
      .delete('/api/day-blocks/db-1')
      .set(AUTH_HEADER);
    expect(deleteRes.status).toBe(200);

    // Auto-schedule ran after creation AND after deletion
    expect(mockDayBlockService.create).toHaveBeenCalledTimes(1);
    expect(mockAutoScheduleService.run).toHaveBeenCalledTimes(1);
  });

  test('creating a second block over the same window is rejected with 409', async () => {
    mockDayBlockService.resolveTimes.mockResolvedValue(validTimes);
    // First create succeeds
    mockDayBlockService.findOverlappingDayBlock.mockResolvedValueOnce(null);
    mockDayBlockService.create.mockResolvedValueOnce({
      dayBlock: sampleDayBlock,
      scheduleResult: sampleScheduleResult,
    });

    const firstRes = await supertest(app)
      .post('/api/day-blocks')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13', from_time: '09:00' });
    expect(firstRes.status).toBe(200);

    // Second create: overlap detected → 409
    mockDayBlockService.findOverlappingDayBlock.mockResolvedValueOnce(
      sampleDayBlock
    );
    const secondRes = await supertest(app)
      .post('/api/day-blocks')
      .set(AUTH_HEADER)
      .send({ date: '2026-04-13', from_time: '09:00' });
    expect(secondRes.status).toBe(409);
    expect(mockDayBlockService.create).toHaveBeenCalledTimes(1);
  });
});
