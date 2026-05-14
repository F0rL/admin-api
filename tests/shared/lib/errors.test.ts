import { describe, it, expect } from 'vitest';
import { AppError } from '../../../src/shared/lib/errors.js';

describe('AppError', () => {
  it('should create error with status code and code', () => {
    const err = new AppError(400, 'VALIDATION_ERROR', 'Invalid input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('Invalid input');
    expect(err.name).toBe('AppError');
  });

  it('should include details when provided', () => {
    const err = new AppError(409, 'DUPLICATE', 'Already exists', { field: 'email' });
    expect(err.details).toEqual({ field: 'email' });
  });

  it('should be instance of Error', () => {
    const err = new AppError(500, 'INTERNAL', 'Oops');
    expect(err).toBeInstanceOf(Error);
  });
});
