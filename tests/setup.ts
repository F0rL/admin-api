import 'dotenv/config';

// Ensure required env vars are set for tests
process.env.DATABASE_URL ??= 'mysql://root:password@localhost:3306/admin_api_test';
process.env.REDIS_URL ??= 'redis://localhost:6379/1';
process.env.SESSION_SECRET ??= 'a'.repeat(32);
