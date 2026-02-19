# Google Groups Automation Setup

Automatically add users to a Google test group when they log in for the first time.

## Overview

This automation:
1. Detects first-time logins by checking if a user has settings in the database
2. Automatically adds new users to a configured Google Group
3. Runs asynchronously so it doesn't block login
4. Won't fail if group membership fails (non-blocking)

## Setup Steps

### 1. Create a Google Workspace Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (`motion-clone-47511`)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **Service Account**
5. Fill in the details:
   - Service account name: `motion-clone-test-group`
   - Click **Create and Continue**
6. Grant roles (optional for now, we'll grant specific access):
   - Click **Create and Continue** again
7. Click **Create Key** → **JSON**
8. Save the JSON file - you'll need the values from it

### 2. Enable the Admin SDK API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Admin SDK API"
3. Click **Enable**

### 3. Set Up Domain-Wide Delegation

1. Go to **APIs & Services** → **Credentials**
2. Click on your service account
3. Go to the **Details** tab
4. Scroll down and click **Show Domain-Wide Delegation**
5. Copy the **Client ID** (you'll need it in the next steps)
6. Go to [Google Admin Console](https://admin.google.com/)
7. Navigate to **Security** → **Access and data control** → **API controls**
8. Click in the text field under "Domain-wide delegation"
9. Add this OAuth scope:
   ```
   https://www.googleapis.com/auth/admin.directory.member
   ```
10. Paste your service account client ID in the first field
11. Click **Authorize**

### 4. Create a Google Test Group

1. Go to [Google Admin Console](https://admin.google.com/)
2. Navigate to **Groups and administration** → **Groups**
3. Click **Create a new group**
4. Fill in:
   - **Name**: Test Users
   - **Email**: `test-users@yourdomain.com` (adjust to your domain)
   - **Description**: "Users with test access"
   - **Access type**: "Restricted - Only invited users"
5. Click **Create**
6. Note down the group email address

### 5. Configure Environment Variables

Add these to your `.env.local` or deployment environment:

```bash
# Google Admin SDK for Group Management
GOOGLE_SERVICE_ACCOUNT_PROJECT_ID=motion-clone-47511
GOOGLE_SERVICE_ACCOUNT_KEY_ID=<from the JSON key file>
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=<from the JSON key file, keep the newlines>
GOOGLE_SERVICE_ACCOUNT_EMAIL=motion-clone-test-group@motion-clone-47511.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_CLIENT_ID=<from the JSON key file>
GOOGLE_SERVICE_ACCOUNT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
GOOGLE_WORKSPACE_ADMIN_EMAIL=<your admin email, e.g. admin@yourdomain.com>

# The test group to add users to
GOOGLE_TEST_GROUP_EMAIL=test-users@yourdomain.com
```

### 6. Extract Values from Service Account JSON

The JSON key file contains all the needed values:

```json
{
  "type": "service_account",
  "project_id": "motion-clone-47511",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "motion-clone-test-group@motion-clone-47511.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

Map these values:
- `project_id` → `GOOGLE_SERVICE_ACCOUNT_PROJECT_ID`
- `private_key_id` → `GOOGLE_SERVICE_ACCOUNT_KEY_ID`
- `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `client_id` → `GOOGLE_SERVICE_ACCOUNT_CLIENT_ID`
- `client_x509_cert_url` → `GOOGLE_SERVICE_ACCOUNT_CERT_URL`

## How It Works

1. When a user logs in, the frontend calls `/api/user-settings/onboarding/status`
2. The backend checks if user settings exist in the database
3. If this is the first login (no settings), it:
   - Creates a new user settings record
   - **Asynchronously** adds the user's email to the configured Google test group
   - Returns onboarding status
4. The Google Group addition happens in the background and won't block the login

## Troubleshooting

### Users not being added to group

**Check logs** - The backend will log success/failure:
```
✓ Added user@example.com to test-users@yourdomain.com
✗ Failed to add user@example.com to test-users@yourdomain.com: ...
```

**Common issues:**

1. **Missing environment variables** - Check all env vars are set
2. **Service account doesn't have domain-wide delegation** - Verify step 3 above
3. **Service account isn't authorized for the API scope** - Re-do step 3
4. **Service account email isn't in Google Workspace** - This is expected; it only needs authorization
5. **User already in group** - This is fine; the API will just log "already member"

### Manual Group Management

To manually add/remove users from the test group:

1. Go to [Google Admin Console](https://admin.google.com/)
2. Navigate to **Groups and administration** → **Groups**
3. Click on your test group
4. Go to **Members**
5. Add/remove members as needed

## Disabling the Automation

If you don't want to automatically add users to a group:

- Simply don't set `GOOGLE_TEST_GROUP_EMAIL`
- The code will skip group addition if the env var is missing
- Users will still be able to log in normally

## Optional: Monitor in Dashboard

You can:
1. Track who's in the test group in Google Admin Console
2. Add custom tracking in your analytics (PostHog)
3. Create custom reports in Google Workspace

## API Reference

The `GoogleGroupService` has these methods:

```typescript
// Add user to group
await googleGroupService.addUserToGroup(userEmail, groupEmail);

// Check if user is in group
const isMember = await googleGroupService.isUserInGroup(userEmail, groupEmail);

// Remove user from group
await googleGroupService.removeUserFromGroup(userEmail, groupEmail);
```

These are used internally, but you can extend the implementation as needed.
