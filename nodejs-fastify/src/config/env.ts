/**
 * 环境变量配置模块
 *
 * 使用 Zod 对 process.env 进行运行时校验和类型推导。
 * 校验失败会打印详细错误并退出进程，确保应用在缺少关键配置时不会启动。
 *
 * 环境变量加载顺序（后加载的会覆盖前者）：
 *   1. .env（公共配置，所有环境共享）
 *   2. .env.development（NODE_ENV=dev 时加载，覆盖 .env）
 *   3. .env.production（NODE_ENV=prod 时加载，覆盖 .env）
 *   4. 系统已存在的 process.env（优先级最高）
 */

import { config } from 'dotenv';
import { z } from 'zod';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '../..');

// 加载 .env（公共配置，应提交到版本管理）
config({ path: resolve(rootDir, '.env') });

// 根据 NODE_ENV 加载对应环境配置
if (process.env.NODE_ENV === 'dev') {
  config({ path: resolve(rootDir, '.env.development'), override: true });
} else if (process.env.NODE_ENV === 'prod') {
  config({ path: resolve(rootDir, '.env.production'), override: true });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['dev', 'prod', 'test']).default('dev'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SESSION_TTL: z.coerce.number().default(86400),
  QUEUE_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
