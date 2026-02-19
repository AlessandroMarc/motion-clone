import express, { type Request, type Response } from 'express';
import cors from 'cors';
import taskRoutes from './routes/tasks.js';
import projectRoutes from './routes/projects.js';
import milestoneRoutes from './routes/milestones.js';
import calendarEventRoutes from './routes/calendarEvents.js';
import userSettingsRoutes from './routes/userSettings.js';
import googleCalendarRoutes from './routes/googleCalendar.js';
import subscriptionRoutes from './routes/subscriptions.js';
import onboardingRoutes from './routes/onboarding.js';
import { ResponseHelper } from './utils/responseHelpers.js';
import { SyncScheduler } from './services/syncScheduler.js';
import { OnboardingEmailScheduler } from './services/onboardingEmailScheduler.js';
import { loadEnv } from './config/loadEnv.js';
import { validateEnvOrThrow, validateEnv } from './config/validateEnv.js';

loadEnv();

// Validate environment variables
// In serverless (Vercel), catch errors and log them instead of crashing
try {
  validateEnvOrThrow();
} catch (error) {
  console.error('Environment validation error:', error);
  // Don't throw here - let the app start and handle errors in routes
  // This allows the health check to still work and provide useful error messages
}

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req: Request, res: Response) => {
  const envStatus = validateEnv();

  if (!envStatus.isValid) {
    return ResponseHelper.error(
      res,
      `Environment configuration error: ${envStatus.errors.join('; ')}`,
      500,
      'Backend is unhealthy due to missing environment variables'
    );
  }

  ResponseHelper.success(
    res,
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      warnings: envStatus.warnings.length > 0 ? envStatus.warnings : undefined,
    },
    'Backend is running!'
  );
});

app.get('/api', (req: Request, res: Response) => {
  ResponseHelper.success(
    res,
    {
      name: 'Nexto API',
      version: '1.0.0',
      description:
        'A RESTful API for managing tasks, projects, milestones, and calendar events',
      endpoints: {
        tasks: '/api/tasks',
        projects: '/api/projects',
        milestones: '/api/milestones',
        calendarEvents: '/api/calendar-events',
      },
    },
    'Welcome to the Nexto API'
  );
});

// CRUD Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/calendar-events', calendarEventRoutes);
app.use('/api/user-settings', userSettingsRoutes);
app.use('/api/google-calendar', googleCalendarRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/onboarding', onboardingRoutes);

// Start sync scheduler
// NOTE: Vercel deploys this backend as a serverless function. In-process schedulers
// (node-cron) and long-running listeners should NOT run there.
if (!process.env.VERCEL) {
  const syncScheduler = new SyncScheduler();
  syncScheduler.start();

  if (process.env.RESEND_API_KEY) {
    const onboardingScheduler = new OnboardingEmailScheduler();
    onboardingScheduler.start();
  }
}

// Start server
// In serverless (Vercel), we export the app and let the platform handle the listener.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
