/**
 * 队列模块入口
 *
 * 提供 Redis 连接实例，并重新导出 Queue/Worker 操作服务。
 * 外部模块只需导入本文件即可使用完整的队列能力。
 */

import { Redis } from 'ioredis';
import { env } from '../../config/env.js';

export const queueConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export * from './queue.service.js';
export * from './worker.service.js';
