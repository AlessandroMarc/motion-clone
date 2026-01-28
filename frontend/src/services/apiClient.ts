import { getAuthToken } from '@/lib/auth';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  count?: number;
}

function resolveApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === 'production'
      ? '/api'
      : 'http://localhost:3003/api')
  );
}

export function getApiBaseUrl(): string {
  return resolveApiBaseUrl();
}

function shouldSetJsonContentType(options: RequestInit): boolean {
  if (!options.body) return false;
  // Most callers send JSON via JSON.stringify (string body).
  if (typeof options.body !== 'string') return false;
  const headers = new Headers(options.headers);
  return !headers.has('Content-Type');
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const baseUrl = resolveApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  try {
    const headers = new Headers(options.headers);

    if (shouldSetJsonContentType(options)) {
      headers.set('Content-Type', 'application/json');
    }

    const token = await getAuthToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      const details = bodyText ? `, message: ${bodyText}` : '';
      throw new Error(
        `HTTP error! status: ${response.status}${details}`.trim()
      );
    }

    // Backend always returns JSON ApiResponse, but keep it resilient.
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as ApiResponse<T>;
    }

    const text = await response.text();
    return { success: true, message: 'OK', data: text as unknown as T };
  } catch (error) {
    // Provide more specific error messages for common network errors
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      // Check for common network error patterns
      if (
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError')
      ) {
        errorMessage = `Unable to connect to backend server at ${baseUrl}. Please ensure the backend is running on port 3003.`;
      } else if (errorMessage.includes('CORS')) {
        errorMessage =
          'CORS error: The backend server may not be configured to allow requests from this origin.';
      }
    }

    return {
      success: false,
      message: 'Failed to connect to the server',
      error: errorMessage,
    };
  }
}
