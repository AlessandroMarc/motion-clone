import * as cron from 'node-cron';
import { OnboardingEmailService } from './onboardingEmailService.js';

/** Run every day at 09:00 UTC */
const SCHEDULE = '0 9 * * *';

export class OnboardingEmailScheduler {
  private emailService: OnboardingEmailService;
  private task: ReturnType<typeof cron.schedule> | null = null;

  constructor(emailService?: OnboardingEmailService) {
    this.emailService = emailService ?? new OnboardingEmailService();
  }

  start(): void {
    if (this.task) {
      console.log('[OnboardingEmailScheduler] Scheduler already running');
      return;
    }

    console.log(
      '[OnboardingEmailScheduler] Starting daily onboarding email scheduler'
    );
    this.task = cron.schedule(SCHEDULE, async () => {
      await this.run();
    });
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('[OnboardingEmailScheduler] Scheduler stopped');
    }
  }

  async run(): Promise<void> {
    console.log('[OnboardingEmailScheduler] Processing pending onboarding emails…');
    try {
      const result = await this.emailService.processPendingEmails();
      console.log(
        `[OnboardingEmailScheduler] Done: ${result.sent} sent, ${result.failed} failed`
      );
      if (result.errors.length > 0) {
        result.errors.forEach(e =>
          console.error('[OnboardingEmailScheduler] Error:', e)
        );
      }
    } catch (error) {
      console.error('[OnboardingEmailScheduler] Fatal error:', error);
    }
  }
}
