import type { Response } from 'express';
import type {
  ApiResponse,
  ApiError,
  ApiSuccess,
  CreateResponse,
  UpdateResponse,
  DeleteResponse,
  ListResponse,
  SingleResponse,
} from '../types/responses.js';

export class ResponseHelper {
  // Success responses
  static success<T>(res: Response, data: T, message?: string): void {
    const response: ApiSuccess<T> = {
      success: true,
      data,
      ...(message && { message }),
    };
    res.json(response);
  }

  // Error responses
  static error(
    res: Response,
    error: string,
    statusCode = 500,
    message?: string
  ): void {
    const response: ApiError = {
      success: false,
      error,
      ...(message && { message }),
    };
    res.status(statusCode).json(response);
  }

  // Create responses
  static created<T>(
    res: Response,
    data: T,
    message = 'Resource created successfully'
  ): void {
    const response: CreateResponse<T> = {
      success: true,
      data,
      message,
    };
    res.status(201).json(response);
  }

  // Update responses
  static updated<T>(
    res: Response,
    data: T,
    message = 'Resource updated successfully'
  ): void {
    const response: UpdateResponse<T> = {
      success: true,
      data,
      message,
    };
    res.json(response);
  }

  // Delete responses
  static deleted(
    res: Response,
    message = 'Resource deleted successfully'
  ): void {
    const response: DeleteResponse = {
      success: true,
      data: null,
      message,
    };
    res.status(200).json(response);
  }

  // List responses
  static list<T>(
    res: Response,
    data: T[],
    message?: string,
    count?: number
  ): void {
    const response: ListResponse<T> = {
      success: true,
      data,
      ...(message && { message }),
      ...(count !== undefined && { count }),
    };
    res.json(response);
  }

  // Single resource responses
  static single<T>(res: Response, data: T, message?: string): void {
    const response: SingleResponse<T> = {
      success: true,
      data,
      ...(message && { message }),
    };
    res.json(response);
  }

  // Not found responses
  static notFound(res: Response, resource = 'Resource'): void {
    const response: ApiError = {
      success: false,
      error: `${resource} not found`,
      message: `The requested ${resource.toLowerCase()} could not be found`,
    };
    res.status(404).json(response);
  }

  // Bad request responses
  static badRequest(res: Response, error: string, message?: string): void {
    const response: ApiError = {
      success: false,
      error,
      ...(message && { message }),
    };
    res.status(400).json(response);
  }

  // Validation error responses
  static validationError(res: Response, error: string, message?: string): void {
    const response: ApiError = {
      success: false,
      error,
      message: message || 'Validation failed',
    };
    res.status(422).json(response);
  }

  // Internal server error responses
  static internalError(res: Response, error = 'Internal server error'): void {
    const response: ApiError = {
      success: false,
      error,
      message: 'An unexpected error occurred',
    };
    res.status(500).json(response);
  }
}
