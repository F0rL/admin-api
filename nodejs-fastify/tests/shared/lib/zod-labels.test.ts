import { describe, it, expect } from 'vitest'
import { registerLabels, getFieldLabel } from '../../../src/shared/lib/zod-labels.js'

describe('zod-labels', () => {
  it('should return label when registered', () => {
    const schema = { type: 'object' }
    registerLabels(schema, { username: '用户名', password: '密码不能为空' })
    expect(getFieldLabel(schema, ['username'])).toBe('用户名')
    expect(getFieldLabel(schema, ['password'])).toBe('密码不能为空')
  })

  it('should return undefined for unregistered field', () => {
    const schema = { type: 'object' }
    registerLabels(schema, { username: '用户名' })
    expect(getFieldLabel(schema, ['unknownField'])).toBeUndefined()
  })

  it('should return undefined for unregistered schema', () => {
    const schema = { type: 'object' }
    expect(getFieldLabel(schema, ['username'])).toBeUndefined()
  })

  it('should not leak between different schemas', () => {
    const schemaA = { id: 'a' }
    const schemaB = { id: 'b' }
    registerLabels(schemaA, { name: '名称A' })
    registerLabels(schemaB, { name: '名称B' })
    expect(getFieldLabel(schemaA, ['name'])).toBe('名称A')
    expect(getFieldLabel(schemaB, ['name'])).toBe('名称B')
  })

  it('should support nested path lookup', () => {
    const schema = { type: 'object' }
    registerLabels(schema, { 'items.quantity': '数量', username: '用户名' })
    expect(getFieldLabel(schema, ['items', 'quantity'])).toBe('数量')
  })

  it('should fallback to top-level field when full path not found', () => {
    const schema = { type: 'object' }
    registerLabels(schema, { name: '姓名' })
    expect(getFieldLabel(schema, ['name', 'first'])).toBe('姓名')
  })
})
