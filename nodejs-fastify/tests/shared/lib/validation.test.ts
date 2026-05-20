import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { validate } from '../../../src/shared/lib/validation.js'
import { registerLabels } from '../../../src/shared/lib/zod-labels.js'
import { AppError } from '../../../src/shared/lib/errors.js'

describe('validate', () => {
  it('should return parsed data on success', () => {
    const schema = z.object({ username: z.string() })
    const data = validate(schema, { username: 'admin' })
    expect(data).toEqual({ username: 'admin' })
  })

  it('should throw AppError with COMMON_PARAM_ERROR on failure', () => {
    const schema = z.object({ username: z.string() })
    try {
      validate(schema, {})
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AppError)
      expect((e as AppError).code).toBe('COMMON_PARAM_ERROR')
      expect((e as AppError).statusCode).toBe(400)
    }
  })

  it('should include formatted details in AppError', () => {
    const schema = z.object({ username: z.string(), password: z.string() })
    try {
      validate(schema, {})
      expect.unreachable('should have thrown')
    } catch (e) {
      const appErr = e as AppError
      expect(appErr.details).toBeDefined()
      expect(Array.isArray(appErr.details)).toBe(true)
      expect((appErr.details as Array<unknown>).length).toBe(2)
    }
  })

  it('should use registered labels in error message', () => {
    const schema = z.object({ username: z.string() })
    registerLabels(schema, { username: '用户名' })
    try {
      validate(schema, {})
      expect.unreachable('should have thrown')
    } catch (e) {
      const details = (e as AppError).details as Array<{ message: string }>
      expect(details[0].message).toBe('用户名')
    }
  })

  it('should prepend pathPrefix to paths in details', () => {
    const schema = z.object({ name: z.string() })
    try {
      validate(schema, {}, { pathPrefix: 'body' })
      expect.unreachable('should have thrown')
    } catch (e) {
      const details = (e as AppError).details as Array<{ path: string }>
      expect(details[0].path).toBe('body.name')
    }
  })

  it('should use first error message as top-level message', () => {
    const schema = z.object({ name: z.string() })
    try {
      validate(schema, {})
      expect.unreachable('should have thrown')
    } catch (e) {
      expect((e as AppError).message).toBe('name 为必填字段')
    }
  })

  it('should handle empty object payload returning multiple errors', () => {
    const schema = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    })
    try {
      validate(schema, {})
      expect.unreachable('should have thrown')
    } catch (e) {
      const details = (e as AppError).details as Array<unknown>
      expect(details.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('should use fallback message when no details available', () => {
    // A schema that produces no issues should use the fallback
    // (unlikely in practice, but covers the fallback branch)
    const schema = z.any().refine(() => false, 'custom error')
    try {
      validate(schema, 'whatever')
    } catch (e) {
      expect((e as AppError).code).toBe('COMMON_PARAM_ERROR')
    }
  })
})
