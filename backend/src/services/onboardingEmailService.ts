import { serviceRoleSupabase } from '../config/supabase.js';
import { ResendService } from './resendService.js';

/** Number of days after signup before each email is sent (0 = immediately) */
const EMAIL_SCHEDULE_DAYS = [0, 1, 2] as const;

export const ONBOARDING_EMAIL_COUNT = 3;

interface OnboardingEmailRow {
  id: string;
  user_id: string;
  email: string;
  email_number: number;
  scheduled_for: string;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'failed';
  error_message: string | null;
}

function getTemplateIdForDay(emailNumber: 1 | 2 | 3): string | undefined {
  const key = `RESEND_ONBOARDING_TEMPLATE_DAY_${emailNumber}` as const;
  return process.env[key];
}

function getFallbackHtml(emailNumber: 1 | 2 | 3): string {
  const content: Record<1 | 2 | 3, { subject: string; body: string }> = {
    1: {
      subject: 'Welcome – get started with Nexto',
      body: '<p>Welcome to Nexto! We\'re excited to have you on board. Start by creating your first task or project.</p>',
    },
    2: {
      subject: 'Tip: Schedule your work in Nexto',
      body: '<p>Did you know you can schedule your tasks directly on your calendar? Head to the Calendar view and drag tasks to the time slots that work best for you.</p>',
    },
    3: {
      subject: 'Sync your Google Calendar with Nexto',
      body: '<p>Connect your Google Calendar to Nexto so your events and tasks stay in sync automatically. Visit your Profile to get started.</p>',
    },
  };

  return content[emailNumber].body;
}

function getSubjectForDay(emailNumber: 1 | 2 | 3): string {
  const subjects: Record<1 | 2 | 3, string> = {
    1: process.env.RESEND_ONBOARDING_SUBJECT_DAY_1 || 'Welcome – get started with Nexto',
    2: process.env.RESEND_ONBOARDING_SUBJECT_DAY_2 || 'Tip: Schedule your work in Nexto',
    3: process.env.RESEND_ONBOARDING_SUBJECT_DAY_3 || 'Sync your Google Calendar with Nexto',
  };
  return subjects[emailNumber];
}

export class OnboardingEmailService {
  private resendService: ResendService;

  constructor(resendService?: ResendService) {
    this.resendService = resendService ?? new ResendService();
  }

  /**
   * Schedules the 3-email onboarding sequence for a newly registered user.
   * Idempotent – calling it again for the same user is a no-op.
   */
  async startSequence(userId: string, email: string): Promise<void> {
    const now = new Date();

    // Build one row per email: email_number 1 → day 0, 2 → day 1, 3 → day 2
    const rows = EMAIL_SCHEDULE_DAYS.map((daysOffset, index) => {
      const scheduledFor = new Date(now);
      scheduledFor.setDate(scheduledFor.getDate() + daysOffset);
      return {
        user_id: userId,
        email,
        email_number: index + 1,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending',
      };
    });

    // upsert – ignore conflicts so calling this twice is safe
    const { error } = await serviceRoleSupabase
      .from('onboarding_email_sequence')
      .upsert(rows, { onConflict: 'user_id,email_number', ignoreDuplicates: true });

    if (error) {
      throw new Error(
        `Failed to schedule onboarding emails for user ${userId}: ${error.message}`
      );
    }
  }

  /**
   * Processes all pending onboarding emails that are due to be sent.
   * Called by the OnboardingEmailScheduler cron job.
   */
  async processPendingEmails(): Promise<{
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const now = new Date().toISOString();

    const { data: pending, error: fetchError } = await serviceRoleSupabase
      .from('onboarding_email_sequence')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    if (fetchError) {
      throw new Error(
        `Failed to fetch pending onboarding emails: ${fetchError.message}`
      );
    }

    if (!pending || pending.length === 0) {
      return { sent: 0, failed: 0, errors: [] };
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of pending as OnboardingEmailRow[]) {
      const emailNumber = row.email_number as 1 | 2 | 3;
      const templateId = getTemplateIdForDay(emailNumber);
      const subject = getSubjectForDay(emailNumber);

      const result = await this.resendService.sendEmail({
        to: row.email,
        subject,
        ...(templateId
          ? {
              templateId,
              templateVariables: { user_id: row.user_id },
            }
          : { html: getFallbackHtml(emailNumber) }),
      });

      if (result.success) {
        await serviceRoleSupabase
          .from('onboarding_email_sequence')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', row.id);
        sent++;
      } else {
        await serviceRoleSupabase
          .from('onboarding_email_sequence')
          .update({ status: 'failed', error_message: result.error ?? null })
          .eq('id', row.id);
        failed++;
        errors.push(
          `Email ${emailNumber} to ${row.email}: ${result.error}`
        );
      }
    }

    return { sent, failed, errors };
  }

  /**
   * Returns the current onboarding email sequence status for a user.
   */
  async getSequenceStatus(
    userId: string
  ): Promise<OnboardingEmailRow[]> {
    const { data, error } = await serviceRoleSupabase
      .from('onboarding_email_sequence')
      .select('*')
      .eq('user_id', userId)
      .order('email_number', { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch onboarding email status: ${error.message}`
      );
    }

    return (data ?? []) as OnboardingEmailRow[];
  }
}
