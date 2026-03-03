import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase config BEFORE importing anything that uses it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockServiceRoleSupabase: any = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn() as jest.Mock<any>,
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
      let callCount = 0;
      let taskDeleteCallCount = 0;
      let projectDeleteCallCount = 0;

      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // First from('tasks').select().eq() - list tasks (returns some tasks)
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'task-1' }],
                error: null,
              }),
            }),
          } as any;
        } else if (callCount === 2) {
          // Second from('tasks').delete().eq() - tasks delete succeeds
          return {
            delete: jest.fn().mockImplementation(() => {
              taskDeleteCallCount++;
              return {
                eq: jest.fn().mockResolvedValue({ error: null }),
              };
            }),
          } as any;
        } else {
          // Third from('projects').delete().eq() - project delete succeeds
          return {
            delete: jest.fn().mockImplementation(() => {
              projectDeleteCallCount++;
              return {
                eq: jest.fn().mockResolvedValue({ error: null }),
              };
            }),
          } as any;
        }
      });

      // Act
      const result = await projectService.deleteProject(
        'project-123',
        mockClient as unknown as SupabaseClient
      );

      // Assert: tasks were deleted first using project_id filter
      expect(mockClient.from).toHaveBeenCalledWith('tasks');
      expect(mockClient.from).toHaveBeenCalledWith('projects');
      expect(taskDeleteCallCount).toBe(1);
      expect(projectDeleteCallCount).toBe(1);
      expect(result).toBe(true);

      expect(result).toBe(true);
    });

    test('should throw an error if deleting tasks fails', async () => {
      // Arrange: tasks deletion fails
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First from('tasks').select().eq() - list tasks (returns some tasks)
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'task-1' }],
                error: null,
              }),
            }),
          } as any;
        } else {
          // Second from('tasks').delete().eq() - tasks delete fails
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: { message: 'Task deletion failed' },
              }),
            }),
          } as any;
        }
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
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First from('tasks').select().eq() - list tasks (returns some tasks)
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'task-1' }],
                error: null,
              }),
            }),
          } as any;
        } else if (callCount === 2) {
          // Second from('tasks').delete().eq() - tasks delete succeeds
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          } as any;
        } else {
          // Third from('projects').delete().eq() - project delete fails
          return {
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                error: { message: 'Project deletion failed' },
              }),
            }),
          } as any;
        }
      });

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
