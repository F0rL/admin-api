/**
 * Zod 全局中文错误映射
 *
 * 通过 z.setErrorMap() 注册，作为兜底——当有人直接调用 schema.parse()
 * （未走 validate()）时，仍有中文提示。
 */

import { z, ZodIssueCode } from 'zod'

export const chineseErrorMap: z.ZodErrorMap = (issue, ctx) => {
  let message: string

  switch (issue.code) {
    case ZodIssueCode.invalid_type: {
      if (issue.received === 'undefined') {
        message = '此项为必填字段'
      } else if (issue.received === 'null') {
        message = '字段不能为空'
      } else {
        message = `字段类型错误，期望${issue.expected}，收到${issue.received}`
      }
      break
    }

    case ZodIssueCode.too_small: {
      const min = issue.minimum
      if (issue.type === 'string') {
        message = issue.exact
          ? `字符串长度必须为 ${min}`
          : `最少输入 ${min} 个字符`
      } else if (issue.type === 'number') {
        message = issue.inclusive ? `数值不能小于 ${min}` : `数值必须大于 ${min}`
      } else if (issue.type === 'array') {
        message = issue.exact ? `数组长度必须为 ${min}` : `至少需要 ${min} 项`
      } else {
        message = ctx.defaultError
      }
      break
    }

    case ZodIssueCode.too_big: {
      const max = issue.maximum
      if (issue.type === 'string') {
        message = `最多输入 ${max} 个字符`
      } else if (issue.type === 'number') {
        message = issue.inclusive ? `数值不能大于 ${max}` : `数值必须小于 ${max}`
      } else if (issue.type === 'array') {
        message = `最多 ${max} 项`
      } else {
        message = ctx.defaultError
      }
      break
    }

    case ZodIssueCode.invalid_string: {
      const validationLabels: Record<string, string> = {
        email: '邮箱',
        url: 'URL',
        uuid: 'UUID',
        datetime: '日期时间',
        date: '日期',
        time: '时间',
        ip: 'IP 地址',
        jwt: 'JWT',
        base64: 'Base64',
      }
      if (typeof issue.validation === 'string') {
        const label = validationLabels[issue.validation]
        message = label ? `${label}格式不正确` : '格式不正确'
      } else {
        message = '格式不正确'
      }
      break
    }

    case ZodIssueCode.invalid_enum_value: {
      message = `无效值，可选值：${issue.options.map(String).join('、')}`
      break
    }

    case ZodIssueCode.custom: {
      message = issue.params?.message ?? '数据校验未通过'
      break
    }

    default:
      message = ctx.defaultError
  }

  return { message }
}
