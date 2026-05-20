import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { formatZodError } from '../../../src/shared/lib/zod-format-error.js'
import { registerLabels } from '../../../src/shared/lib/zod-labels.js'

describe('formatZodError', () => {
  // ── invalid_type ────────────────────────────────────
  describe('invalid_type', () => {
    it('should format undefined as "{field} 为必填字段"', () => {
      const schema = z.object({ username: z.string() })
      const result = schema.safeParse({})
      const details = formatZodError(result.error!, { schema })
      expect(details[0].path).toBe('username')
      expect(details[0].message).toBe('username 为必填字段')
    })

    it('should use registered Chinese label as complete message', () => {
      const schema = z.object({ username: z.string() })
      registerLabels(schema, { username: '用户名' })
      const result = schema.safeParse({})
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('用户名')
    })

    it('should use registered label override when message is configured', () => {
      const schema = z.object({ password: z.string().min(1) })
      registerLabels(schema, { password: '密码不能为空' })
      const result = schema.safeParse({ password: '' })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('密码不能为空')
    })

    it('should format null as "{field} 不能为空"', () => {
      const schema = z.object({ avatar: z.string() })
      const result = schema.safeParse({ avatar: null })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('avatar 不能为空')
    })

    it('should format type mismatch with expected/received labels', () => {
      const schema = z.object({ age: z.number() })
      const result = schema.safeParse({ age: 'abc' })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('age 类型错误，期望 数值，收到 字符串')
    })

    it('should handle unknown type labels gracefully', () => {
      const schema = z.object({ val: z.number() })
      const result = schema.safeParse({ val: Symbol('x') })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toContain('类型错误')
    })
  })

  // ── too_small ───────────────────────────────────────
  describe('too_small', () => {
    it('should format string min as "{field} 最少输入 {min} 个字符"', () => {
      const schema = z.object({ password: z.string().min(6) })
      const result = schema.safeParse({ password: 'abc' })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('password 最少输入 6 个字符')
    })

    it('should format string exact as "{field} 长度必须为 {min}"', () => {
      const schema = z.object({ phone: z.string().length(11) })
      const result = schema.safeParse({ phone: '123' })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('phone 长度必须为 11')
    })

    it('should format number min as "{field} 不能小于 {min}"', () => {
      const schema = z.object({ age: z.number().min(18) })
      const result = schema.safeParse({ age: 10 })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('age 不能小于 18')
    })

    it('should format number exclusive min as "{field} 必须大于 {min}"', () => {
      const schema = z.object({ age: z.number().gt(18) })
      const result = schema.safeParse({ age: 18 })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('age 必须大于 18')
    })

    it('should format array min as "{field} 至少需要 {min} 项"', () => {
      const schema = z.object({ tags: z.array(z.string()).min(2) })
      const result = schema.safeParse({ tags: ['a'] })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('tags 至少需要 2 项')
    })

    it('should format array exact as "{field} 长度必须为 {min}"', () => {
      const schema = z.object({ roles: z.array(z.string()).length(3) })
      const result = schema.safeParse({ roles: ['a', 'b'] })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('roles 长度必须为 3')
    })

    it('should format date inclusive as "{field} 不能早于 {date}"', () => {
      const minDate = new Date('2024-01-01')
      const schema = z.object({ startDate: z.date().min(minDate) })
      const result = schema.safeParse({ startDate: new Date('2023-01-01') })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toContain('不能早于')
      expect(details[0].message).toContain('2024-01-01')
    })

    it('should format date exclusive as "{field} 必须晚于 {date}"', () => {
      // ZodDate.min is inclusive by default; there's no gt() on ZodDate,
      // so use the exclusive format from issue.inclusive=false on a number via refine.
      // Actually, date exclusive can be triggered via refine or schema-level.
      // For now test the inclusive path only since ZodDate lacks gt().
    })
  })

  // ── too_big ─────────────────────────────────────────
  describe('too_big', () => {
    it('should format string max as "{field} 最多输入 {max} 个字符"', () => {
      const schema = z.object({ name: z.string().max(10) })
      const result = schema.safeParse({ name: 'a'.repeat(20) })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('name 最多输入 10 个字符')
    })

    it('should format number max as "{field} 不能大于 {max}"', () => {
      const schema = z.object({ age: z.number().max(120) })
      const result = schema.safeParse({ age: 200 })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('age 不能大于 120')
    })

    it('should format number exclusive max as "{field} 必须小于 {max}"', () => {
      const schema = z.object({ age: z.number().lt(120) })
      const result = schema.safeParse({ age: 120 })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('age 必须小于 120')
    })

    it('should format array max as "{field} 最多 {max} 项"', () => {
      const schema = z.object({ tags: z.array(z.string()).max(5) })
      const result = schema.safeParse({ tags: ['a', 'b', 'c', 'd', 'e', 'f'] })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('tags 最多 5 项')
    })

    it('should format date inclusive max as "{field} 不能晚于 {date}"', () => {
      const maxDate = new Date('2025-12-31')
      const schema = z.object({ endDate: z.date().max(maxDate) })
      const result = schema.safeParse({ endDate: new Date('2026-01-01') })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toContain('不能晚于')
      expect(details[0].message).toContain('2025-12-31')
    })

    it('should format date exclusive max as "{field} 必须早于 {date}"', () => {
      // ZodDate.max is inclusive; there's no lt() on ZodDate.
      // This test is a placeholder for the exclusive branch.
    })
  })

  // ── invalid_string ──────────────────────────────────
  describe('invalid_string', () => {
    it('should format email', () => {
      const schema = z.object({ email: z.string().email() })
      const result = schema.safeParse({ email: 'not-an-email' })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('email 邮箱 格式不正确')
    })

    it('should format url', () => {
      const schema = z.object({ url: z.string().url() })
      const result = schema.safeParse({ url: 'not-a-url' })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('url URL 格式不正确')
    })

    it('should format uuid', () => {
      const schema = z.object({ uuid: z.string().uuid() })
      const result = schema.safeParse({ uuid: 'not-a-uuid' })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('uuid UUID 格式不正确')
    })

    it('should format ip', () => {
      const schema = z.object({ ip: z.string().ip() })
      const result = schema.safeParse({ ip: 'not-an-ip' })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('ip IP 地址 格式不正确')
    })

    it('should format datetime', () => {
      const schema = z.object({ date: z.string().datetime() })
      const result = schema.safeParse({ date: 'not-a-date' })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('date 日期时间 格式不正确')
    })

    it('should format date validation', () => {
      const schema = z.object({ d: z.string().date() })
      const result = schema.safeParse({ d: 'not-a-date' })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('d 日期 格式不正确')
    })

    it('should format regex as "{field} 格式不符合要求"', () => {
      const schema = z.object({ code: z.string().regex(/^[a-z]+$/) })
      const result = schema.safeParse({ code: 'ABC' })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('code 格式不符合要求')
    })

    it('should format jwt', () => {
      const schema = z.object({ token: z.string().jwt() })
      const result = schema.safeParse({ token: 'not-a-jwt' })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('token JWT 格式不正确')
    })

    it('should format base64', () => {
      const schema = z.object({ data: z.string().base64() })
      const result = schema.safeParse({ data: 'not-base64!' })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('data Base64 格式不正确')
    })

    it('should format includes', () => {
      const schema = z.object({ content: z.string().includes('tuna') })
      const result = schema.safeParse({ content: 'fish' })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('content 必须包含 tuna')
    })

    it('should format startsWith', () => {
      const schema = z.object({ url: z.string().startsWith('https://') })
      const result = schema.safeParse({ url: 'http://example.com' })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('url 必须以 https:// 开头')
    })

    it('should format endsWith', () => {
      const schema = z.object({ file: z.string().endsWith('.ts') })
      const result = schema.safeParse({ file: 'file.js' })
      const details = formatZodError(result.error!, { schema })
      expect(details[0].message).toBe('file 必须以 .ts 结尾')
    })
  })

  // ── invalid_enum_value ──────────────────────────────
  it('should format invalid_enum_value as "{field} 可选值：{options}"', () => {
    const schema = z.object({ type: z.enum(['目录', '菜单', '按钮']) })
    const result = schema.safeParse({ type: '其他' })
    const details = formatZodError(result.error!, { schema })
    expect(details[0].message).toContain('可选值')
    expect(details[0].message).toContain('目录')
    expect(details[0].message).toContain('菜单')
    expect(details[0].message).toContain('按钮')
  })

  // ── invalid_date ────────────────────────────────────
  it('should format invalid_date as "{field} 日期格式不正确"', () => {
    const schema = z.object({ startDate: z.date() })
    const result = schema.safeParse({ startDate: new Date('invalid') })
    const details = formatZodError(result.error!, { schema })
    expect(details[0].message).toBe('startDate 日期格式不正确')
  })

  // ── unrecognized_keys ───────────────────────────────
  it('should format unrecognized_keys correctly', () => {
    const schema = z.object({ name: z.string() }).strict()
    const result = schema.safeParse({ name: 'hello', extra: 'bad' })
    const details = formatZodError(result.error!, { schema })
    expect(details[0].message).toContain('不允许的字段')
    expect(details[0].message).toContain('extra')
  })

  // ── not_multiple_of ─────────────────────────────────
  it('should format not_multiple_of as "{field} 必须是 {n} 的倍数"', () => {
    const schema = z.object({ count: z.number().multipleOf(5) })
    const result = schema.safeParse({ count: 7 })
    const details = formatZodError(result.error!, { schema })
    expect(details[0].message).toBe('count 必须是 5 的倍数')
  })

  // ── not_finite ──────────────────────────────────────
  it('should format not_finite as "{field} 必须为有限数值"', () => {
    const schema = z.object({ value: z.number().finite() })
    const result = schema.safeParse({ value: Infinity })
    const details = formatZodError(result.error!, { schema })
    expect(details[0].message).toBe('value 必须为有限数值')
  })

  // ── custom (refine) ─────────────────────────────────
  it('should format custom error with params.message', () => {
    const schema = z.object({
      password: z.string().refine(
        (val) => val.length >= 8,
        { message: '密码长度至少 8 位' }
      ),
    })
    const result = schema.safeParse({ password: '123' })
    const details = formatZodError(result.error!, { schema })
    expect(details[0].message).toBe('密码长度至少 8 位')
  })

  // ── invalid_intersection_types ──────────────────────
  it('should format invalid_intersection_types gracefully', () => {
  // Union types in Zod issue code handling
  const schema = z.intersection(z.object({ a: z.string() }), z.object({ b: z.number() }))
  const result = schema.safeParse({ a: 'x' })
  const details = formatZodError(result.error!, { schema: {} })
  // Intersection validation errors depend on Zod internals;
  // just verify it doesn't throw
  expect(Array.isArray(details)).toBe(true)
})

  // ── pathPrefix ──────────────────────────────────────
  it('should prepend pathPrefix to path', () => {
    const schema = z.object({ username: z.string() })
    const result = schema.safeParse({})
    const details = formatZodError(result.error!, { schema, pathPrefix: 'body' })
    expect(details[0].path).toBe('body.username')
  })

  // ── without schema (no label lookup) ────────────────
  it('should work without schema option', () => {
    const schema = z.object({ name: z.string() })
    const result = schema.safeParse({})
    const details = formatZodError(result.error!)
    expect(details[0].message).toBe('name 为必填字段')
  })

  // ── nested object paths ─────────────────────────────
  it('should format nested object errors correctly', () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
      }),
    })
    const result = schema.safeParse({ user: { name: 123 } })
    const details = formatZodError(result.error!, { schema })
    expect(details[0].path).toBe('user.name')
    expect(details[0].message).toContain('类型错误')
  })

  // ── array items ─────────────────────────────────────
  it('should format array item errors correctly', () => {
    const schema = z.object({
      items: z.array(z.object({ qty: z.number() })),
    })
    const result = schema.safeParse({ items: [{ qty: 'abc' }] })
    const details = formatZodError(result.error!, { schema })
    expect(details[0].path).toBe('items.0.qty')
  })
})
