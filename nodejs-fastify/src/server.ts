/**
 * 应用入口
 *
 * 构建 Fastify 实例并启动 HTTP 监听。
 * 启动失败时记录错误并退出进程。
 */

import { env } from './config/env.js';
import { buildApp } from './app.js';
import { waitForDatabase } from './database/prisma.js';

async function start() {
  console.log('等待数据库就绪...')
  await waitForDatabase()
  console.log('数据库连接成功')

  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Server running at http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
