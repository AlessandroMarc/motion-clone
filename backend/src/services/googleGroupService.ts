import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { requireEnv } from '../config/env.js';

export class GoogleGroupService {
  private adminSDK: any;

  constructor() {
    // Initialize Google Admin SDK with service account and domain-wide delegation
    const googleServiceAccount = {
      type: 'service_account',
      project_id: requireEnv('GOOGLE_SERVICE_ACCOUNT_PROJECT_ID'),
      private_key_id: requireEnv('GOOGLE_SERVICE_ACCOUNT_KEY_ID'),
      private_key: requireEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY').replace(
        /\\n/g,
        '\n'
      ),
      client_email: requireEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
      client_id: requireEnv('GOOGLE_SERVICE_ACCOUNT_CLIENT_ID'),
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url:
        'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: requireEnv('GOOGLE_SERVICE_ACCOUNT_CERT_URL'),
    };

    // Create JWT auth with domain-wide delegation
    // The subject parameter impersonates the admin user to make API calls
    const auth = new JWT({
      email: googleServiceAccount.client_email,
      key: googleServiceAccount.private_key,
      subject: requireEnv('GOOGLE_WORKSPACE_ADMIN_EMAIL'),
      scopes: ['https://www.googleapis.com/auth/admin.directory.member'],
    });

    this.adminSDK = google.admin({ version: 'directory_v1', auth });
  }

  /**
   * Add a user to a Google Group
   * @param userEmail The email of the user to add
   * @param groupEmail The email of the Google Group
   * @returns true if successful, false if user already exists in group
   */
  async addUserToGroup(userEmail: string, groupEmail: string): Promise<boolean> {
    try {
      await this.adminSDK.members.insert({
        groupKey: groupEmail,
        requestBody: {
          email: userEmail,
          role: 'MEMBER',
        },
      });
      console.log(`✓ Added ${userEmail} to ${groupEmail}`);
      return true;
    } catch (error: any) {
      // If user already exists in group, that's not an error
      if (error.message?.includes('Member already exists')) {
        console.log(`ℹ ${userEmail} already member of ${groupEmail}`);
        return true;
      }
      console.error(`✗ Failed to add ${userEmail} to ${groupEmail}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if user is member of a group
   */
  async isUserInGroup(userEmail: string, groupEmail: string): Promise<boolean> {
    try {
      await this.adminSDK.members.get({
        groupKey: groupEmail,
        memberKey: userEmail,
      });
      return true;
    } catch (error: any) {
      if (error.message?.includes('Member not found')) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Remove user from a Google Group
   */
  async removeUserFromGroup(
    userEmail: string,
    groupEmail: string
  ): Promise<void> {
    try {
      await this.adminSDK.members.delete({
        groupKey: groupEmail,
        memberKey: userEmail,
      });
      console.log(`✓ Removed ${userEmail} from ${groupEmail}`);
    } catch (error: any) {
      if (error.message?.includes('Member not found')) {
        console.log(`ℹ ${userEmail} not member of ${groupEmail}`);
        return;
      }
      console.error(
        `✗ Failed to remove ${userEmail} from ${groupEmail}:`,
        error.message
      );
      throw error;
    }
  }
}
