/**
 * 统一业务异常类
 *
 * 继承 Error，携带 HTTP 状态码、错误码和可选详情。
 * 全局错误中间件会根据 AppError 实例返回统一的 JSON 错误响应。
 */

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
