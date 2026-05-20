/**
 * 统一校验入口
 *
 * 在路由中替代 schema.parse()，提供一致的错误格式化：
 *   成功 → 返回类型安全的 T
 *   失败 → throw AppError(400, 'COMMON_PARAM_ERROR', message, details)
 *
 * 用法：
 *   const input = validate(loginSchema, request.body, { pathPrefix: 'body' })
 */

import { type ZodSchema, type ZodTypeDef } from 'zod'
import { AppError } from './errors.js'
import { formatZodError } from './zod-format-error.js'

export interface ValidateOptions {
  /** 路径前缀，如 'body'、'query' */
  pathPrefix?: string
}

export function validate<Output, Def extends ZodTypeDef = ZodTypeDef, Input = Output>(
  schema: ZodSchema<Output, Def, Input>,
  data: unknown,
  options?: ValidateOptions
): Output {
  const result = schema.safeParse(data)

  if (result.success) {
    return result.data
  }

  const details = formatZodError(result.error, {
    schema: schema as object,
    pathPrefix: options?.pathPrefix,
  })

  const firstMessage = details[0]?.message ?? '请求参数校验失败'
  throw new AppError(400, 'COMMON_PARAM_ERROR', firstMessage, details)
}
