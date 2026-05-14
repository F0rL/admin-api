/**
 * 统一 API 响应格式
 *
 * 所有接口统一返回 { success, data } 或 { success, error } 结构。
 * ok() 用于成功响应，fail() 用于错误响应，确保前端可以统一处理。
 */

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
