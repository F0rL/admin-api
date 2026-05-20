/**
 * 字段名注册表
 *
 * 在 schema 文件中注册字段中文名，formatZodError 通过 getFieldLabel()
 * 获取字段名并拼接到错误消息中。
 *
 * 用法：
 *   registerLabels(loginSchema, {
 *     username: '用户名',
 *     password: '密码不能为空',
 *   })
 *
 * 优先级：注册的值 > 字段路径末尾
 */

const registry = new WeakMap<object, Record<string, string>>()

export function registerLabels(schema: object, labels: Record<string, string>): void {
  registry.set(schema, labels)
}

export function getFieldLabel(schema: object, path: string[]): string | undefined {
  const labels = registry.get(schema)
  if (!labels) return undefined

  // 优先匹配完整路径（支持嵌套）
  const fullPath = path.join('.')
  if (fullPath in labels) return labels[fullPath]

  // 其次匹配顶层字段名
  const topField = path[0]
  if (topField !== undefined && topField in labels) return labels[topField]

  return undefined
}
