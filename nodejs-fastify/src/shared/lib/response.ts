export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

export function ok<T>(data: T, message?: string): SuccessResponse<T> {
  return { success: true, data, ...(message ? { message } : {}) };
}

export function fail(code: string, message: string, details?: unknown): ErrorResponse {
  return { success: false, error: { code, message, ...(details ? { details } : {}) } };
}
