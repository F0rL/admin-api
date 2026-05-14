/**
 * Prisma 数据库客户端单例
 *
 * 开发环境启用查询日志方便调试，生产环境仅记录 warn/error。
 * 利用 globalThis 缓存实例，避免开发环境热重载时创建多个连接。
 */

import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

function createPrismaClient() {
  const client = new PrismaClient({
    log: env.NODE_ENV === 'dev' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });
  return client;
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'prod') {
  globalThis.__prisma = prisma;
}
