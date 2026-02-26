import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { Response } from 'express';
import { ResponseHelper } from '../responseHelpers.js';

function createMockResponse(): jest.Mocked<Partial<Response>> {
  return {
    status: jest.fn().mockReturnThis() as any,
    json: jest.fn().mockReturnThis() as any,
  };
}

describe('ResponseHelper', () => {
  let res: jest.Mocked<Partial<Response>>;

  beforeEach(() => {
    res = createMockResponse();
  });

  describe('success', () => {
    test('should respond with success and data', () => {
      const data = { id: '1', name: 'Test' };
      ResponseHelper.success(res as Response, data, 'OK');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data, message: 'OK' })
      );
    });

    test('should omit message when not provided', () => {
      ResponseHelper.success(res as Response, { x: 1 });
      const call = (res.json as jest.Mock).mock.calls[0][0] as any;
      expect(call.success).toBe(true);
      expect(call.message).toBeUndefined();
    });
  });

  describe('created', () => {
    test('should respond with 201 status and data', () => {
      const data = { id: '42' };
      ResponseHelper.created(res as Response, data, 'Created!');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data, message: 'Created!' })
      );
    });

    test('should use default message when not provided', () => {
      ResponseHelper.created(res as Response, {});
      const call = (res.json as jest.Mock).mock.calls[0][0] as any;
      expect(call.message).toBe('Resource created successfully');
    });
  });

  describe('updated', () => {
    test('should respond with 200 status and updated data', () => {
      const data = { id: '1', name: 'Updated' };
      ResponseHelper.updated(res as Response, data, 'Updated!');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data, message: 'Updated!' })
      );
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('deleted', () => {
    test('should respond with 200 status and null data', () => {
      ResponseHelper.deleted(res as Response, 'Deleted!');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: null, message: 'Deleted!' })
      );
    });

    test('should use default message when not provided', () => {
      ResponseHelper.deleted(res as Response);
      const call = (res.json as jest.Mock).mock.calls[0][0] as any;
      expect(call.message).toBe('Resource deleted successfully');
    });
  });

  describe('list', () => {
    test('should respond with list data and count', () => {
      const data = [{ id: '1' }, { id: '2' }];
      ResponseHelper.list(res as Response, data, 'Listed', 2);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data, message: 'Listed', count: 2 })
      );
    });

    test('should omit count when not provided', () => {
      ResponseHelper.list(res as Response, []);
      const call = (res.json as jest.Mock).mock.calls[0][0] as any;
      expect(call.count).toBeUndefined();
    });
  });

  describe('single', () => {
    test('should respond with single resource', () => {
      const data = { id: '1', title: 'Task' };
      ResponseHelper.single(res as Response, data, 'Found');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data, message: 'Found' })
      );
    });
  });

  describe('notFound', () => {
    test('should respond with 404', () => {
      ResponseHelper.notFound(res as Response, 'Task');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Task not found' })
      );
    });

    test('should use default resource name', () => {
      ResponseHelper.notFound(res as Response);
      const call = (res.json as jest.Mock).mock.calls[0][0] as any;
      expect(call.error).toBe('Resource not found');
    });
  });

  describe('badRequest', () => {
    test('should respond with 400', () => {
      ResponseHelper.badRequest(res as Response, 'Invalid input');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Invalid input' })
      );
    });

    test('should include optional message', () => {
      ResponseHelper.badRequest(res as Response, 'err', 'detail');
      const call = (res.json as jest.Mock).mock.calls[0][0] as any;
      expect(call.message).toBe('detail');
    });
  });

  describe('unauthorized', () => {
    test('should respond with 401', () => {
      ResponseHelper.unauthorized(res as Response);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Unauthorized' })
      );
    });

    test('should include custom error message', () => {
      ResponseHelper.unauthorized(res as Response, 'Token expired');
      const call = (res.json as jest.Mock).mock.calls[0][0] as any;
      expect(call.error).toBe('Token expired');
    });
  });

  describe('internalError', () => {
    test('should respond with 500', () => {
      ResponseHelper.internalError(res as Response, 'DB error');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'DB error' })
      );
    });

    test('should use default error message', () => {
      ResponseHelper.internalError(res as Response);
      const call = (res.json as jest.Mock).mock.calls[0][0] as any;
      expect(call.error).toBe('Internal server error');
    });
  });

  describe('validationError', () => {
    test('should respond with 422', () => {
      ResponseHelper.validationError(res as Response, 'Field required');
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Field required' })
      );
    });
  });

  describe('error', () => {
    test('should respond with specified status code', () => {
      ResponseHelper.error(res as Response, 'Something went wrong', 503);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Something went wrong' })
      );
    });

    test('should default to 500 status code', () => {
      ResponseHelper.error(res as Response, 'Error');
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
