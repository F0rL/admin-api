import { describe, it, expect, beforeAll } from 'vitest'

describe('env config', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'mysql://localhost:3306/test'
    process.env.REDIS_URL = 'redis://localhost:6379/0'
    // Unset so env.ts uses defaults
    delete process.env.PORT
  })

  it('should load and validate env variables', async () => {
    const { env } = await import('../../src/config/env.js')
    expect(env.NODE_ENV).toBe('test')
    expect(env.DATABASE_URL).toBe('mysql://localhost:3306/test')
    expect(env.REDIS_URL).toBe('redis://localhost:6379/0')
    expect(env.SESSION_TTL).toBe(86400)
  })

  it('should use PORT from .env file when present', async () => {
    const { env } = await import('../../src/config/env.js')
    // .env sets PORT=4000, env.ts loads it at import time
    expect(env.PORT).toBe(4000)
    expect(typeof env.QUEUE_ENABLED).toBe('boolean')
  })
})
