# Supabase Authentication Setup Guide

This guide will help you set up Supabase authentication with Google OAuth for the Motion Clone application.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. A Google Cloud Console account for OAuth setup

## Step 1: Create a Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `motion-clone` (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Select the region closest to your users
5. Click "Create new project"

## Step 2: Get Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (this is your `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public** key (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Step 3: Set Up Environment Variables

1. Copy the example environment file:

   ```bash
   cp frontend/.env.example frontend/.env
   ```

2. Update `frontend/.env` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Configure Google OAuth Provider

### 4.1 Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Create OAuth 2.0 credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client IDs**
   - Choose **Web application**
   - Add authorized redirect URIs:
     - `https://your-project-id.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (for local development)
   - Copy the **Client ID** and **Client Secret**

### 4.2 Configure Supabase Auth

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** in the list and click the toggle to enable it
3. Enter your Google OAuth credentials:
   - **Client ID**: Your Google OAuth Client ID
   - **Client Secret**: Your Google OAuth Client Secret
4. Click **Save**

## Step 5: Update Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `backend/supabase-schema.sql`
3. Click **Run** to execute the SQL and create the required tables

## Step 6: Configure Row Level Security (RLS)

The database schema includes basic RLS policies that allow all operations. For production, you should customize these policies based on your authentication needs.

To update RLS policies:

1. Go to **Authentication** → **Policies** in your Supabase dashboard
2. Review and modify the policies for each table:
   - `projects`
   - `milestones`
   - `tasks`
   - `calendar_events`

Example policy for user-specific data:

```sql
-- Example: Only allow users to see their own projects
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
```

## Step 7: Test the Setup

1. Start your development servers:

   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)
3. Try signing in with Google
4. Verify that you can access the Tasks and Projects pages

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**:
   - Make sure your Google OAuth redirect URIs match exactly
   - Check that you're using the correct Supabase project URL

2. **"Missing Supabase environment variables" error**:
   - Verify your `.env` file is in the `frontend` directory
   - Check that the variable names start with `NEXT_PUBLIC_`
   - Restart your development server after adding environment variables

3. **API requests failing with 401**:
   - Check that the backend is running on port 3003
   - Verify that the Supabase service role key is configured in the backend

4. **Database connection issues**:
   - Ensure the database schema has been applied
   - Check that RLS policies are properly configured

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
