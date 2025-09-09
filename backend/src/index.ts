import express, { type Request, type Response } from 'express';
import cors from 'cors';
import taskRoutes from './routes/tasks.js';
import projectRoutes from './routes/projects.js';
import milestoneRoutes from './routes/milestones.js';
import calendarEventRoutes from './routes/calendarEvents.js';
import { ResponseHelper } from './utils/responseHelpers.js';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req: Request, res: Response) => {
  ResponseHelper.success(
    res,
    { status: 'healthy', timestamp: new Date().toISOString() },
    'Backend is running!'
  );
});

app.get('/api', (req: Request, res: Response) => {
  ResponseHelper.success(
    res,
    {
      name: 'Motion Clone API',
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
    'Welcome to the Motion Clone API'
  );
});

// CRUD Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/calendar-events', calendarEventRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
