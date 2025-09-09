// Standard API response types for consistent structure

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
}

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  message?: string;
}

// Specific response types for different operations
export interface CreateResponse<T> extends ApiSuccess<T> {
  message: string;
}

export interface UpdateResponse<T> extends ApiSuccess<T> {
  message: string;
}

export interface DeleteResponse extends ApiSuccess<null> {
  message: string;
}

export interface ListResponse<T> extends ApiSuccess<T[]> {
  count?: number;
}

export interface SingleResponse<T> extends ApiSuccess<T> {
  message?: string;
}
