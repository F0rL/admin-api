import { describe, it, expect } from 'vitest';
import { ok, fail } from '../../../src/shared/lib/response.js';

describe('response helpers', () => {
  it('ok() should return success response', () => {
    const result = ok({ id: 1 });
    expect(result).toEqual({ success: true, data: { id: 1 } });
  });

  it('ok() should include message when provided', () => {
    const result = ok(null, 'Created');
    expect(result).toEqual({ success: true, data: null, message: 'Created' });
  });

  it('fail() should return error response', () => {
    const result = fail('NOT_FOUND', 'User not found');
    expect(result).toEqual({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
  });

  it('fail() should include details when provided', () => {
    const result = fail('VALIDATION_ERROR', 'Invalid input', { field: 'email' });
    expect(result).toEqual({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: { field: 'email' } },
    });
  });
});
