'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';

import { projectService } from '@/services/projectService';
import { taskService } from '@/services/taskService';
import { ProjectDetailView } from '@/components/Projects/ProjectDetailView';
import { ProjectTasksSection } from '@/components/Projects/ProjectTasksSection';
import { Project, Task } from '../../../../../shared/types';

interface ProjectDetailPageProps {
  params: {
    id: string;
  };
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const router = useRouter();
  const urlParams = useParams();
  // Use params from props if available, otherwise fall back to useParams hook
  const projectId = params?.id || (urlParams?.id as string);
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectData = async (id: string) => {
    if (!id) {
      setError('Project ID is required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const [fetchedProject, fetchedTasks] = await Promise.all([
        projectService.getProjectById(id),
        taskService.getTasksByProject(id),
      ]);
      setProject(fetchedProject);
      setTasks(fetchedTasks);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch project data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectData(projectId);
    }
  }, [projectId]);

  const handleProjectUpdate = (updatedProject: Project) => {
    setProject(updatedProject);
    toast.success('Project updated successfully');
  };

  const handleTaskCreate = async (
    taskData: Omit<
      Task,
      'id' | 'created_at' | 'updated_at' | 'status' | 'dependencies'
    >
  ) => {
    if (!projectId) {
      toast.error('Project ID is required');
      return;
    }

    try {
      const newTask = await taskService.createTask({
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.due_date,
        priority: taskData.priority,
        project_id: projectId,
        plannedDurationMinutes: taskData.planned_duration_minutes,
        actualDurationMinutes: taskData.actual_duration_minutes,
      });
      setTasks(prev => [...prev, newTask]);
      toast.success('Task created successfully');
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
      throw error;
    }
  };

  const handleTaskUnlink = async (taskId: string) => {
    try {
      await taskService.updateTask(taskId, { project_id: null });
      setTasks(prev => prev.filter(task => task.id !== taskId));
      toast.success('Task unlinked from project');
    } catch (error) {
      console.error('Failed to unlink task:', error);
      toast.error('Failed to unlink task');
    }
  };

  const handleBack = () => {
    router.push('/projects');
  };

  // Show error if projectId is not available
  if (!projectId) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              Invalid Project ID
            </h1>
            <p className="text-muted-foreground mb-4">
              The project ID is missing or invalid.
            </p>
            <Button onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading project...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              Project Not Found
            </h1>
            <p className="text-muted-foreground mb-4">
              {error || 'The project you are looking for does not exist.'}
            </p>
            <Button onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex-1 p-6 animate-in fade-in duration-300">
        <div className="max-w-4xl mx-auto">
          {/* Header with Back Button */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-4 hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              {project.name}
            </h1>
            <p className="text-muted-foreground">
              Manage your project details and tasks
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <ProjectDetailView
              project={project}
              onProjectUpdate={handleProjectUpdate}
            />

            <ProjectTasksSection
              projectId={projectId}
              tasks={tasks}
              onTaskCreate={handleTaskCreate}
              onTaskUnlink={handleTaskUnlink}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
