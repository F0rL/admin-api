import { describe, it, expect } from 'vitest'
import { AppError } from '../../../src/shared/lib/errors.js'

describe('AppError', () => {
  it('should create error with status code, string code, and message', () => {
    const err = new AppError(400, 'COMMON_PARAM_ERROR', 'Invalid input')
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('COMMON_PARAM_ERROR')
    expect(err.message).toBe('Invalid input')
    expect(err.name).toBe('AppError')
  })

  it('should include details when provided', () => {
    const err = new AppError(409, 'USER_EXISTS', 'User already exists', { field: 'email' })
    expect(err.details).toEqual({ field: 'email' })
  })

  it('should be instance of Error', () => {
    const err = new AppError(500, 'COMMON_ERROR', 'Oops')
    expect(err).toBeInstanceOf(Error)
  })

  it('should be throwable and catchable', () => {
    expect(() => {
      throw new AppError(403, 'FORBIDDEN', 'No permission')
    }).toThrow(AppError)
  })
})
