import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { AppError } from '../../../src/shared/lib/errors.js';
import { fail } from '../../../src/shared/lib/response.js';

describe('error middleware logic', () => {
  it('should format AppError correctly', () => {
    const err = new AppError(404, 1102, 'User not found');
    expect(err.statusCode).toBe(404);
  });

  it('should have correct response shape for AppError', () => {
    const err = new AppError(400, 1002, 'bad');
    const expected = fail(err.code, err.message);
    expect(expected).toEqual({
      success: false,
      error: { code: 1002, message: 'bad' },
    });
  });
});
