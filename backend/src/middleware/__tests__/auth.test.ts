import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { Response, NextFunction } from 'express';

// Mock Supabase config BEFORE importing anything that uses it
const mockGetAuthenticatedSupabase = jest.fn();
const mockVerifyAuthToken = jest.fn();
jest.unstable_mockModule('../../config/supabase.js', () => ({
  getAuthenticatedSupabase: mockGetAuthenticatedSupabase,
  verifyAuthToken: mockVerifyAuthToken,
}));

// Now import the modules that depend on the mocked module
const { authMiddleware } = await import('../auth.js');
const { mockAuthUser, mockAuthError } =
  await import('../../__tests__/helpers/supabaseMock.js');

// Define AuthRequest type inline
interface AuthRequest extends Request {
  authToken: string;
  userId: string;
  supabaseClient: any;
  headers: any;
}

describe('authMiddleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup mock request
    mockRequest = {
      headers: {},
    };

    // Setup mock response with chainable methods
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Setup mock next function
    mockNext = jest.fn();

    // Setup mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
      },
    };

    // Mock getAuthenticatedSupabase to return our mock client
    mockGetAuthenticatedSupabase.mockReturnValue(mockSupabaseClient);

    // Reset strict mode
    delete process.env.STRICT_AUTH_MODE;
  });

  describe('Missing or invalid Authorization header', () => {
    test('should return 401 when Authorization header is missing', async () => {
      await authMiddleware(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Missing or invalid Authorization header',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 401 when Authorization header does not start with Bearer', async () => {
      mockRequest.headers = {
        authorization: 'Basic token123',
      };

      await authMiddleware(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 401 when Authorization header is empty', async () => {
      mockRequest.headers = {
        authorization: '',
      };

      await authMiddleware(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Valid token authentication with local JWT verification', () => {
    test('should authenticate with valid JWT using local verification', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token-123',
      };

      // Mock local JWT verification (fast path)
      mockVerifyAuthToken.mockReturnValue({
        userId: 'user-456',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await authMiddleware(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      // Verify local JWT verification was called
      expect(mockVerifyAuthToken).toHaveBeenCalledWith('valid-token-123');

      // Verify remote call was NOT made (since STRICT_AUTH_MODE is off)
      expect(mockSupabaseClient.auth.getUser).not.toHaveBeenCalled();

      // Verify user info attached
      expect(mockRequest.userId).toBe('user-456');
      expect(mockRequest.authToken).toBe('valid-token-123');
      expect(mockRequest.supabaseClient).toBe(mockSupabaseClient);

      // Verify next was called
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('should attach authenticated Supabase client to request', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token-123',
      };

      mockVerifyAuthToken.mockReturnValue({
        userId: 'user-456',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await authMiddleware(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockGetAuthenticatedSupabase).toHaveBeenCalledWith(
        'valid-token-123'
      );
      expect(mockRequest.supabaseClient).toBeDefined();
      expect(mockRequest.supabaseClient).toBe(mockSupabaseClient);
    });

    test('should extract token correctly after Bearer prefix', async () => {
      mockRequest.headers = {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      };

      mockVerifyAuthToken.mockReturnValue({
        userId: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await authMiddleware(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.authToken).toBe(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      );
      expect(mockVerifyAuthToken).toHaveBeenCalledWith(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Strict mode with remote verification', () => {
    beforeEach(() => {
      process.env.STRICT_AUTH_MODE = 'true';
    });

    test('should perform additional remote verification in strict mode', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token-123',
      };

      mockVerifyAuthToken.mockReturnValue({
        userId: 'user-456',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      mockSupabaseClient.auth.getUser.mockResolvedValue(
        mockAuthUser('user-456')
      );

      await authMiddleware(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      // Verify both local AND remote verification were called
      expect(mockVerifyAuthToken).toHaveBeenCalledWith('valid-token-123');
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject if remote verification fails in strict mode', async () => {
      mockRequest.headers = {
        authorization: 'Bearer token-123',
      };

      mockVerifyAuthToken.mockReturnValue({
        userId: 'user-456',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      mockSupabaseClient.auth.getUser.mockResolvedValue(
        mockAuthError('Remote validation failed')
      );

      await authMiddleware(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject if user IDs mismatch in strict mode', async () => {
      mockRequest.headers = {
        authorization: 'Bearer token-123',
      };

      mockVerifyAuthToken.mockReturnValue({
        userId: 'user-456',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      mockSupabaseClient.auth.getUser.mockResolvedValue(
        mockAuthUser('different-user-789') // Mismatched user ID
      );

      await authMiddleware(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Invalid or expired token', () => {
    test('should return 401 when JWT verification fails', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockVerifyAuthToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authMiddleware(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid token',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 401 when token is expired', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token',
      };

      mockVerifyAuthToken.mockImplementation(() => {
        throw new Error('Token has expired');
      });

      await authMiddleware(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Token has expired',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    test('should handle exceptions during token verification', async () => {
      mockRequest.headers = {
        authorization: 'Bearer malformed-token',
      };

      mockVerifyAuthToken.mockImplementation(() => {
        throw new Error('Malformed JWT');
      });

      await authMiddleware(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Malformed JWT',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle non-Error exceptions', async () => {
      mockRequest.headers = {
        authorization: 'Bearer bad-token',
      };

      mockVerifyAuthToken.mockImplementation(() => {
        throw 'String error message';
      });

      await authMiddleware(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to verify token',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
