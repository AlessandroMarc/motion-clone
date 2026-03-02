import { jest } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a mock Supabase client for testing
 * Returns a Jest-mocked Supabase client with chainable query methods
 */
export function createMockSupabaseClient(
  overrides?: Partial<SupabaseClient>
): jest.Mocked<SupabaseClient> {
  const mockClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    order: jest.fn().mockReturnThis(),
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
    },
    ...overrides,
  } as unknown as jest.Mocked<SupabaseClient>;

  return mockClient;
}

/**
 * Creates a standardized query response for Supabase mocks
 */
export function mockSupabaseQuery<T>(data: T, error: Error | null = null) {
  return Promise.resolve({ data, error });
}

/**
 * Creates a mock authenticated user response
 * Matches Supabase auth.getUser() response structure
 */
export function mockAuthUser(userId: string = 'test-user-id') {
  return {
    data: {
      user: {
        id: userId,
        email: 'test@example.com',
        aud: 'authenticated',
        role: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
    error: null,
  };
}

/**
 * Creates a mock auth error response
 * Matches Supabase auth.getUser() error response structure
 */
export function mockAuthError(message: string = 'Invalid token') {
  return {
    data: {
      user: null,
    },
    error: {
      message,
      status: 401,
    },
  };
}
