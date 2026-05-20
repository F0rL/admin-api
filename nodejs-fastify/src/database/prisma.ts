/**
 * Prisma 数据库客户端单例
 *
 * Prisma v7 使用 @prisma/adapter-mariadb 驱动连接 MySQL。
 * 开发环境启用查询日志方便调试，生产环境仅记录 warn/error。
 * 利用 globalThis 缓存实例，避免开发环境热重载时创建多个连接。
 */

import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { env } from '../config/env.js'

function parseDatabaseUrl(url: string) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!match) {
    throw new Error('Invalid DATABASE_URL format')
  }
  // 强制使用 IPv4 127.0.0.1 而非 localhost (::1)
  const host = match[3] === 'localhost' ? '127.0.0.1' : match[3]
  return {
    user: match[1],
    password: match[2],
    host: host,
    port: parseInt(match[4], 10),
    database: match[5],
  }
}

function createPrismaClient() {
  const dbConfig = parseDatabaseUrl(env.DATABASE_URL)
  const adapter = new PrismaMariaDb({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    connectionLimit: 10,
    acquireTimeout: 30000, // 30秒，默认10秒
  })
  const client = new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === 'dev' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  })
  return client
}

/**
 * 等待数据库就绪，首次连接失败时自动重试。
 * 用于应用启动时确保 MySQL 可用后再开始接受请求。
 */
const RETRY_INTERVAL = 2000
const MAX_RETRIES = 30

export async function waitForDatabase(): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await prisma.$connect()
      return
    } catch {
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL))
      }
    }
  }
  // 最后一次尝试，失败将直接抛出异常
  await prisma.$connect()
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const prisma = globalThis.__prisma ?? createPrismaClient()

if (env.NODE_ENV !== 'prod') {
  globalThis.__prisma = prisma
}
