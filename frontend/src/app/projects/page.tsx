'use client';

import { useState } from 'react';
import { ProjectCreateForm } from '@/components/Projects/ProjectCreateForm';
import { ProjectList } from '@/components/Projects/ProjectList';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import type { Project } from '@/../../../shared/types';
import { projectService } from '@/services/projectService';

export default function ProjectsPage() {
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { user } = useAuth();

  const handleProjectCreate = async (
    projectData: Omit<
      Project,
      'id' | 'createdAt' | 'updatedAt' | 'milestones' | 'status'
    >
  ) => {
    setIsCreatingProject(true);
    try {
      if (!user) {
        throw new Error('User must be authenticated to create a project');
      }

      await projectService.createProject({
        name: projectData.name,
        description: projectData.description,
        deadline: projectData.deadline,
        user_id: user.id,
      });
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to create project:', error);
      // Re-throw the error so the form can handle it properly
      throw error;
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleProjectUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <ProtectedRoute>
      <div className="flex-1 p-3 md:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">
              Project Manager
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Organize your larger goals and track project progress
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-xl md:text-2xl font-semibold">Your Projects</h2>
              <ProjectCreateForm
                onProjectCreate={handleProjectCreate}
                isLoading={isCreatingProject}
              />
            </div>
            <ProjectList
              refreshTrigger={refreshTrigger}
              onProjectUpdate={handleProjectUpdate}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
