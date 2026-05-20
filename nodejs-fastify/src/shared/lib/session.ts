/**
 * Session 管理工具
 *
 * 纯请求头方式：登录时生成 UUID v7 作为 sessionId 存入 Redis，
 * 后续请求通过 Authorization: Bearer <sessionId> 传递。
 * 所有操作独立封装，不依赖 Fastify 实例。
 *
 * Redis Key: session:{sessionId}
 * Redis TTL: SESSION_TTL（滑动过期，每次 getSession 续期）
 */

import { Redis } from 'ioredis';
import { uuidv7 } from 'uuidv7';
import { env } from '../../config/env.js';

export interface SessionData {
  userId: string;
  username: string;
  role: string;
}

let redis: Redis | null = null;

function getClient(): Redis {
  if (!redis) {
    // ioredis 将 localhost 解析为 ::1 (IPv6)，强制使用 127.0.0.1
    const url = env.REDIS_URL.replace('localhost', '127.0.0.1')
    redis = new Redis(url);
  }
  return redis;
}

function sessionKey(sessionId: string): string {
  return `session:${sessionId}`;
}

export async function createSession(data: SessionData): Promise<string> {
  const sessionId = uuidv7();
  const key = sessionKey(sessionId);
  await getClient().setex(key, env.SESSION_TTL, JSON.stringify(data));
  return sessionId;
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const key = sessionKey(sessionId);
  const raw = await getClient().get(key);
  if (!raw) return null;

  // Sliding expiration: reset TTL on each access
  await getClient().expire(key, env.SESSION_TTL);
  return JSON.parse(raw) as SessionData;
}

export async function destroySession(sessionId: string): Promise<void> {
  const key = sessionKey(sessionId);
  await getClient().del(key);
}

export async function closeSessionRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
