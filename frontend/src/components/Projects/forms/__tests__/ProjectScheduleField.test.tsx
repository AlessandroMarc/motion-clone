import { PERSONAL_SCHEDULE_TOKEN } from '../ProjectScheduleField';

describe('ProjectScheduleField', () => {
  it('uses a non-empty placeholder value for the personal-schedule option', () => {
    expect(PERSONAL_SCHEDULE_TOKEN).not.toBe('');
  });
});
