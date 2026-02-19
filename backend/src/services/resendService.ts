import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string;
  subject: string;
  /** Resend template ID (from RESEND_ONBOARDING_TEMPLATE_DAY_1/2/3 env vars) */
  templateId?: string;
  /** Template variables passed to the Resend template */
  templateVariables?: Record<string, string>;
  /** Fallback HTML body when no template is configured */
  html?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class ResendService {
  private client: Resend;
  private fromAddress: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        'RESEND_API_KEY is not set. Please add it to your environment variables.'
      );
    }
    this.client = new Resend(apiKey);
    this.fromAddress =
      process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      let result;

      if (options.templateId) {
        // Send via a Resend template – subject/from are optional (can be set in template)
        result = await this.client.emails.send({
          from: this.fromAddress,
          to: options.to,
          template: {
            id: options.templateId,
            ...(options.templateVariables
              ? { variables: options.templateVariables }
              : {}),
          },
        });
      } else if (options.html) {
        result = await this.client.emails.send({
          from: this.fromAddress,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });
      } else {
        throw new Error(
          'Either templateId or html must be provided to send an email.'
        );
      }

      const { data, error } = result;
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
