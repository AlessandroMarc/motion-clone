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
      rpc: jest.fn(),
    };
  });

  describe('deleteProject', () => {
    test('should delete project and all related data atomically via RPC', async () => {
      // Arrange: RPC succeeds and returns success
      const mockRpc = jest.fn().mockImplementation(() =>
        Promise.resolve({
          data: [
            {
              success: true,
              message: 'Project and all related data deleted successfully',
            },
          ],
          error: null,
        })
      );
      mockClient.rpc = mockRpc;

      // Act
      const result = await projectService.deleteProject(
        'project-123',
        mockClient as unknown as SupabaseClient
      );

      // Assert: RPC was called with correct parameters
      expect(mockRpc).toHaveBeenCalledWith('delete_project_and_tasks', {
        p_project_id: 'project-123',
      });
      expect(result).toBe(true);
    });

    test('should throw an error if RPC call fails', async () => {
      // Arrange: RPC fails
      const mockRpc = jest.fn().mockImplementation(() =>
        Promise.resolve({
          data: null,
          error: { message: 'RPC call failed' },
        })
      );
      mockClient.rpc = mockRpc;

      // Suppress expected error log
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Act & Assert
      await expect(
        projectService.deleteProject(
          'project-123',
          mockClient as unknown as SupabaseClient
        )
      ).rejects.toThrow('Failed to delete project: RPC call failed');

      // Cleanup
      consoleErrorSpy.mockRestore();
    });

    test('should throw an error if RPC returns failure status', async () => {
      // Arrange: RPC returns success flag as false
      const mockRpc = jest.fn().mockImplementation(() =>
        Promise.resolve({
          data: [{ success: false, message: 'Database constraint violation' }],
          error: null,
        })
      );
      mockClient.rpc = mockRpc;

      // Suppress expected error log
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Act & Assert
      await expect(
        projectService.deleteProject(
          'project-123',
          mockClient as unknown as SupabaseClient
        )
      ).rejects.toThrow(
        'Project deletion failed: Database constraint violation'
      );

      // Cleanup
      consoleErrorSpy.mockRestore();
    });
  });
});
