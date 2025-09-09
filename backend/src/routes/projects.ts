import express, { type Request, type Response } from 'express';
import { ProjectService } from '../services/projectService.js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from '../types/database.js';
import { ResponseHelper } from '../utils/responseHelpers.js';

const router = express.Router();
const projectService = new ProjectService();

// GET /api/projects - Get all projects
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let projects;
    if (status && typeof status === 'string') {
      projects = await projectService.getProjectsByStatus(
        status as 'not-started' | 'in-progress' | 'completed'
      );
    } else {
      projects = await projectService.getAllProjects();
    }

    ResponseHelper.list(
      res,
      projects,
      'Projects retrieved successfully',
      projects.length
    );
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// GET /api/projects/:id - Get project by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return ResponseHelper.badRequest(res, 'Project ID is required');
    }
    const project = await projectService.getProjectById(id);

    if (!project) {
      return ResponseHelper.notFound(res, 'Project');
    }

    ResponseHelper.single(res, project, 'Project retrieved successfully');
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// POST /api/projects - Create new project
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: CreateProjectInput = req.body;
    const project = await projectService.createProject(input);
    ResponseHelper.created(res, project, 'Project created successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return ResponseHelper.badRequest(res, 'Project ID is required');
    }
    const input: UpdateProjectInput = req.body;
    const project = await projectService.updateProject(id, input);
    ResponseHelper.updated(res, project, 'Project updated successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return ResponseHelper.badRequest(res, 'Project ID is required');
    }
    await projectService.deleteProject(id);
    ResponseHelper.deleted(res, 'Project deleted successfully');
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

export default router;
