import { describe, it, expect } from 'vitest'
import { ok, fail } from '../../../src/shared/lib/response.js'

describe('response helpers', () => {
  describe('ok()', () => {
    it('should return success response with data', () => {
      const result = ok({ id: 1 })
      expect(result).toEqual({ success: true, data: { id: 1 } })
    })

    it('should include message when provided', () => {
      const result = ok(null, 'Created')
      expect(result).toEqual({ success: true, data: null, message: 'Created' })
    })

    it('should omit message when not provided', () => {
      const result = ok([1, 2, 3])
      expect(result).not.toHaveProperty('message')
    })
  })

  describe('fail()', () => {
    it('should return error response with code and message', () => {
      const result = fail('USER_NOT_FOUND', 'User not found')
      expect(result).toEqual({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      })
    })

    it('should include details when provided', () => {
      const result = fail('COMMON_PARAM_ERROR', 'Invalid input', { field: 'email' })
      expect(result).toEqual({
        success: false,
        error: { code: 'COMMON_PARAM_ERROR', message: 'Invalid input', details: { field: 'email' } },
      })
    })

    it('should omit details when not provided', () => {
      const result = fail('AUTH_FAILED', 'Auth failed')
      expect(result.error).not.toHaveProperty('details')
    })
  })
})
