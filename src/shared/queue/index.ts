import { Redis } from 'ioredis';
import { env } from '../../config/env.js';

export const queueConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export * from './queue.service.js';
export * from './worker.service.js';
