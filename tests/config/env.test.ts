import { describe, it, expect } from 'vitest';

describe('env config', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'mysql://localhost:3306/test';
    process.env.REDIS_URL = 'redis://localhost:6379/0';
    process.env.SESSION_SECRET = 'a'.repeat(32);
  });

  it('should load and validate env variables', async () => {
    const { env } = await import('../../src/config/env.js');
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('test');
    expect(env.SESSION_TTL).toBe(86400);
  });
});
