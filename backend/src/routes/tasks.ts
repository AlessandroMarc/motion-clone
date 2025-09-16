import express, { type Request, type Response } from 'express';
import { TaskService } from '../services/taskService.js';
import type { CreateTaskInput, UpdateTaskInput } from '../types/database.js';
import { ResponseHelper } from '../utils/responseHelpers.js';

const router = express.Router();
const taskService = new TaskService();

// GET /api/tasks - Get all tasks
router.get('/', async (req: Request, res: Response) => {
  try {
    const { project_id, status } = req.query;

    let tasks;
    if (project_id && typeof project_id === 'string') {
      tasks = await taskService.getTasksByProjectId(project_id);
    } else if (status && typeof status === 'string') {
      tasks = await taskService.getTasksByStatus(
        status as 'pending' | 'in-progress' | 'completed'
      );
    } else {
      tasks = await taskService.getAllTasks();
    }

    ResponseHelper.list(
      res,
      tasks,
      'Tasks retrieved successfully',
      tasks.length
    );
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// GET /api/tasks/:id - Get task by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return ResponseHelper.badRequest(res, 'Task ID is required');
    }
    const task = await taskService.getTaskById(id);

    if (!task) {
      return ResponseHelper.notFound(res, 'Task');
    }

    ResponseHelper.single(res, task, 'Task retrieved successfully');
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// POST /api/tasks - Create new task
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: CreateTaskInput = req.body;
    console.log('Backend received task input:', input);
    const task = await taskService.createTask(input);
    console.log('Backend created task:', task);
    ResponseHelper.created(res, task, 'Task created successfully');
  } catch (error) {
    console.error('Backend task creation error:', error);
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return ResponseHelper.badRequest(res, 'Task ID is required');
    }
    const input: UpdateTaskInput = req.body;
    const task = await taskService.updateTask(id, input);
    ResponseHelper.updated(res, task, 'Task updated successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return ResponseHelper.badRequest(res, 'Task ID is required');
    }
    await taskService.deleteTask(id);
    ResponseHelper.deleted(res, 'Task deleted successfully');
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

export default router;
