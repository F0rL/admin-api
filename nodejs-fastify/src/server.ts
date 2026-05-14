/**
 * 应用入口
 *
 * 构建 Fastify 实例并启动 HTTP 监听。
 * 启动失败时记录错误并退出进程。
 */

import { env } from './config/env.js';
import { buildApp } from './app.js';

async function start() {
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
