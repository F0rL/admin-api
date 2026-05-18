import 'dotenv/config';

// Ensure required env vars are set for tests
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'mysql://root:password@localhost:3306/admin_api_test';
process.env.REDIS_URL ??= 'redis://localhost:6379/1';
