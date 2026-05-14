/**
 * 开发环境一键初始化脚本
 *
 * 注意：本脚本会重置数据库！仅用于首次搭建或重建开发环境。
 *
 * 运行方式：pnpm dev:init
 * 前置条件：MySQL 和 Redis 容器已通过 Docker Compose 启动
 */

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { config } from 'dotenv';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');

// 加载环境变量到 process.env，子进程会自动继承
config({ path: resolve(projectRoot, '.env') });
config({ path: resolve(projectRoot, '.env.development'), override: true });

console.log('DATABASE_URL:', process.env.DATABASE_URL);

function run(cmd: string) {
  const shell = process.platform === 'win32' ? 'pwsh.exe' : undefined as string | undefined;
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: projectRoot, shell, env: { ...process.env } });
}

async function main() {
  console.log('=== 开发环境初始化开始 ===\n');

  // 1. 创建初始迁移并应用到数据库
  console.log('[1/4] 创建并应用数据库迁移...');
  run('prisma migrate dev --name init');

  // 2. 生成 Prisma Client
  console.log('[2/4] 生成 Prisma Client...');
  run('npx prisma generate');

  // 3. 填充种子数据（默认管理员 admin / admin123）
  console.log('[3/4] 填充种子数据...');
  run('npx prisma db seed');

  // 4. 运行测试验证
  console.log('[4/4] 运行测试验证...');
  run('npx vitest run');

  console.log('\n=== 初始化完成 ===');
  console.log('运行 pnpm dev 启动开发服务');
  console.log('默认管理员账号：admin / admin123');
}

main().catch((e) => {
  console.error('初始化失败:', e.message);
  process.exit(1);
});
