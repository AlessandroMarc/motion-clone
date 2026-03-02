import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase config BEFORE importing anything that uses it
const mockServiceRoleSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  order: jest.fn().mockReturnThis(),
};

jest.unstable_mockModule('../config/supabase.js', () => ({
  serviceRoleSupabase: mockServiceRoleSupabase,
  getAuthenticatedSupabase: jest.fn().mockReturnValue(mockServiceRoleSupabase),
  verifyAuthToken: jest.fn(),
}));

const { ProjectService } = await import('../services/projectService.js');

describe('ProjectService', () => {
  let projectService: InstanceType<typeof ProjectService>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    projectService = new ProjectService();

    // Re-build a fresh mock client with chainable methods for each test
    mockClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
    };
  });

  describe('deleteProject', () => {
    test('should delete all related tasks before deleting the project', async () => {
      // Arrange: tasks deletion succeeds, then project deletion succeeds
      mockClient.eq
        .mockResolvedValueOnce({ error: null }) // tasks delete
        .mockResolvedValueOnce({ error: null }); // project delete

      // Act
      const result = await projectService.deleteProject(
        'project-123',
        mockClient as unknown as SupabaseClient
      );

      // Assert: tasks were deleted first using project_id filter
      expect(mockClient.from).toHaveBeenCalledWith('tasks');
      expect(mockClient.delete).toHaveBeenCalled();
      expect(mockClient.eq).toHaveBeenCalledWith('project_id', 'project-123');

      // Assert: then the project itself was deleted
      expect(mockClient.from).toHaveBeenCalledWith('projects');
      expect(mockClient.eq).toHaveBeenCalledWith('id', 'project-123');

      expect(result).toBe(true);
    });

    test('should throw an error if deleting tasks fails', async () => {
      // Arrange: tasks deletion fails
      mockClient.eq.mockResolvedValueOnce({
        error: { message: 'Task deletion failed' },
      });

      // Act & Assert
      await expect(
        projectService.deleteProject(
          'project-123',
          mockClient as unknown as SupabaseClient
        )
      ).rejects.toThrow('Failed to delete project tasks: Task deletion failed');
    });

    test('should throw an error if deleting the project fails', async () => {
      // Arrange: tasks deletion succeeds, project deletion fails
      mockClient.eq
        .mockResolvedValueOnce({ error: null }) // tasks delete
        .mockResolvedValueOnce({
          error: { message: 'Project deletion failed' },
        }); // project delete

      // Act & Assert
      await expect(
        projectService.deleteProject(
          'project-123',
          mockClient as unknown as SupabaseClient
        )
      ).rejects.toThrow('Failed to delete project: Project deletion failed');
    });
  });
});
