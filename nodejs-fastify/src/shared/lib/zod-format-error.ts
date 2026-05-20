/**
 * ZodError 格式化器
 *
 * 将 ZodError 格式化为前端友好的 { path, message }[] 结构。
 * 配合 zod-labels 使用，自动注入字段中文名。
 *
 * 格式化规则优先级：
 *   1. registerLabels 中配置了 message → 直接使用
 *   2. 根据 ZodIssueCode 和 issue 属性拼接字段名 + 错误描述
 *   3. 未覆盖的 issue → 兜底消息
 */

import { z, ZodError, ZodIssueCode } from 'zod'
import { getFieldLabel } from './zod-labels.js'

export interface ZodFormattedIssue {
  path: string
  message: string
}

export interface FormatZodErrorOptions {
  /** schema 对象，用于查找字段中文名 */
  schema?: object
  /** 路径前缀，如 'body'、'query' */
  pathPrefix?: string
}

/**
 * 将 ZodError 格式化为 { path, message }[] 数组
 */
export function formatZodError(
  error: ZodError,
  options?: FormatZodErrorOptions
): ZodFormattedIssue[] {
  return error.errors.map(issue => {
    const fullPath = buildPath(issue.path, options?.pathPrefix)
    const message = formatIssueWithSchema(issue, options?.schema)
    return { path: fullPath, message }
  })
}

/**
 * 格式化 issue，优先使用 schema 注册的 label（作为完整消息），
 * 否则用 issue 信息和字段名拼接
 */
function formatIssueWithSchema(
  issue: z.ZodIssue,
  schema: object | undefined
): string {
  if (schema) {
    const label = getFieldLabel(schema, issue.path.map(String))
    if (label !== undefined) {
      // 注册了 label → 直接作为完整消息
      return label
    }
  }
  // 没有注册 label → 用字段名 + 错误类型拼接
  const field = String(issue.path.at(-1) ?? '')
  return formatIssue(issue, field)
}

/**
 * 构建完整路径字符串
 */
function buildPath(path: (string | number)[], prefix?: string): string {
  const joined = path.join('.')
  return prefix ? `${prefix}.${joined}` : joined
}

/**
 * 根据 issue 类型和字段名生成消息
 */
function formatIssue(issue: z.ZodIssue, field: string): string {
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      return formatInvalidType(issue, field)
    case ZodIssueCode.too_small:
      return formatTooSmall(issue, field)
    case ZodIssueCode.too_big:
      return formatTooBig(issue, field)
    case ZodIssueCode.invalid_string:
      return formatInvalidString(issue, field)
    case ZodIssueCode.invalid_enum_value:
      return `${field} 可选值：${issue.options.map(String).join('、')}`
    case ZodIssueCode.invalid_date:
      return `${field} 日期格式不正确`
    case ZodIssueCode.unrecognized_keys:
      return `不允许的字段：${issue.keys.join('、')}`
    case ZodIssueCode.not_multiple_of:
      return `${field} 必须是 ${issue.multipleOf} 的倍数`
    case ZodIssueCode.not_finite:
      return `${field} 必须为有限数值`
    case ZodIssueCode.invalid_intersection_types:
      return `${field} 数据不满足交集校验`
    case ZodIssueCode.custom:
      return issue.message ?? issue.params?.message ?? `${field} 数据校验未通过`
    default:
      return `${field} 数据校验未通过`
  }
}

function formatInvalidType(
  issue: z.ZodInvalidTypeIssue,
  field: string
): string {
  if (issue.received === 'undefined') {
    return `${field} 为必填字段`
  }
  if (issue.received === 'null') {
    return `${field} 不能为空`
  }
  const typeLabels: Record<string, string> = {
    string: '字符串',
    number: '数值',
    boolean: '布尔值',
    bigint: '大整数',
    symbol: '符号',
    object: '对象',
    array: '数组',
    date: '日期',
    nan: 'NaN',
  }
  const expected = typeLabels[issue.expected] ?? issue.expected
  const received = typeLabels[issue.received] ?? issue.received
  return `${field} 类型错误，期望 ${expected}，收到 ${received}`
}

function formatTooSmall(issue: z.ZodTooSmallIssue, field: string): string {
  const min = issue.minimum
  if (issue.type === 'string') {
    return issue.exact
      ? `${field} 长度必须为 ${min}`
      : `${field} 最少输入 ${min} 个字符`
  }
  if (issue.type === 'number') {
    return issue.inclusive
      ? `${field} 不能小于 ${min}`
      : `${field} 必须大于 ${min}`
  }
  if (issue.type === 'array') {
    return issue.exact
      ? `${field} 长度必须为 ${min}`
      : `${field} 至少需要 ${min} 项`
  }
  if (issue.type === 'date') {
    return issue.inclusive
      ? `${field} 不能早于 ${new Date(Number(min)).toISOString().slice(0, 10)}`
      : `${field} 必须晚于 ${new Date(Number(min)).toISOString().slice(0, 10)}`
  }
  return `${field} 最少为 ${min}`
}

function formatTooBig(issue: z.ZodTooBigIssue, field: string): string {
  const max = issue.maximum
  if (issue.type === 'string') {
    return `${field} 最多输入 ${max} 个字符`
  }
  if (issue.type === 'number') {
    return issue.inclusive
      ? `${field} 不能大于 ${max}`
      : `${field} 必须小于 ${max}`
  }
  if (issue.type === 'array') {
    return `${field} 最多 ${max} 项`
  }
  if (issue.type === 'date') {
    return issue.inclusive
      ? `${field} 不能晚于 ${new Date(Number(max)).toISOString().slice(0, 10)}`
      : `${field} 必须早于 ${new Date(Number(max)).toISOString().slice(0, 10)}`
  }
  return `${field} 最多为 ${max}`
}

/**
 * 格式化 invalid_string 子类型，抽离为独立函数便于维护扩展
 */
function formatInvalidString(
  issue: z.ZodInvalidStringIssue,
  field: string
): string {
  if (typeof issue.validation === 'string') {
    const validationLabels: Record<string, string> = {
      email: '邮箱',
      url: 'URL',
      uuid: 'UUID',
      regex: '',
      datetime: '日期时间',
      date: '日期',
      time: '时间',
      duration: '持续时间',
      ip: 'IP 地址',
      cidr: 'CIDR',
      base64: 'Base64',
      jwt: 'JWT',
      base64url: 'Base64URL',
      emoji: 'Emoji',
      nanoid: 'NanoID',
      cuid: 'CUID',
      cuid2: 'CUID2',
      ulid: 'ULID',
    }
    const label = validationLabels[issue.validation]
    if (issue.validation === 'regex') {
      return `${field} 格式不符合要求`
    }
    if (label) {
      return `${field} ${label} 格式不正确`
    }
    return `${field} 格式不正确`
  }
  if ('includes' in issue.validation) {
    return `${field} 必须包含 ${issue.validation.includes}`
  }
  if ('startsWith' in issue.validation) {
    return `${field} 必须以 ${issue.validation.startsWith} 开头`
  }
  if ('endsWith' in issue.validation) {
    return `${field} 必须以 ${issue.validation.endsWith} 结尾`
  }
  return `${field} 格式不正确`
}
