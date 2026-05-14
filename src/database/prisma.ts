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
