/**
 * 开发环境初始化脚本
 *
 * 从零开始搭建开发环境：
 *   1. 自动创建 .env / .env.development（从 .env.example 复制）
 *   2. 检查 MySQL（3306）和 Redis（6379）是否可连接
 *   3. 执行 Prisma 迁移
 *   4. 填充种子数据
 *
 * 使用方式：pnpm dev:init
 * 前置条件：Docker 中已启动 MySQL 和 Redis 容器
 */

import { execSync } from 'node:child_process';
import { existsSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import net from 'node:net';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');

// ===== 工具函数 =====

function run(cmd: string): void {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: projectRoot });
}

function copyIfMissing(src: string, dest: string, label: string): void {
  if (existsSync(dest)) {
    console.log(`  ✓ ${label} 已存在，跳过`);
    return;
  }
  copyFileSync(src, dest);
  console.log(`  ✓ 已创建 ${label}`);
}

/** 检测 host:port 是否可连接（超时 3 秒） */
function checkPort(host: string, port: number, service: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);
    socket.on('connect', () => {
      socket.destroy();
      resolve();
    });
    socket.on('error', (err: NodeJS.ErrnoException) => {
      socket.destroy();
      reject(new Error(`${service} 连接失败 (${host}:${port}): ${err.message}`));
    });
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`${service} 连接超时 (${host}:${port})`));
    });
    socket.connect(port, host);
  });
}

// ===== 主流程 =====

async function main() {
  console.log('=== 开发环境初始化开始 ===\n');

  // 1. 创建 .env 文件（如果不存在）
  console.log('[1/5] 创建环境配置文件...');
  copyIfMissing(
    resolve(projectRoot, '.env.example'),
    resolve(projectRoot, '.env'),
    '.env',
  );
  copyIfMissing(
    resolve(projectRoot, '.env.example'),
    resolve(projectRoot, '.env.development'),
    '.env.development',
  );

  // 2. 检查 MySQL 和 Redis 是否可连接
  console.log('\n[2/5] 检查基础设施服务...');
  try {
    await checkPort('127.0.0.1', 3306, 'MySQL');
    console.log('  ✓ MySQL 连接正常 (127.0.0.1:3306)');
  } catch (e) {
    console.error(`  ✗ ${(e as Error).message}`);
    console.error('\n请确保 MySQL 容器已在运行：');
    console.error('  cd .. && docker compose up -d mysql');
    console.error('或者如果使用 WSL2，检查容器是否在 WSL2 中启动。');
    process.exit(1);
  }

  try {
    await checkPort('127.0.0.1', 6379, 'Redis');
    console.log('  ✓ Redis 连接正常 (127.0.0.1:6379)');
  } catch (e) {
    console.error(`  ✗ ${(e as Error).message}`);
    console.error('\n请确保 Redis 容器已在运行：');
    console.error('  cd .. && docker compose up -d redis');
    console.error('或者如果使用 WSL2，检查容器是否在 WSL2 中启动。');
    process.exit(1);
  }

  // 3. 生成 Prisma Client
  console.log('\n[3/5] 生成 Prisma Client...');
  run('npx prisma generate');

  // 4. 创建并应用数据库迁移
  console.log('\n[4/5] 创建并应用数据库迁移...');
  run('npx prisma migrate dev --name init');

  // 5. 填充种子数据
  console.log('\n[5/5] 填充种子数据...');
  run('npx prisma db seed');

  console.log('\n=== 初始化完成 ===');
  console.log('运行 pnpm dev 启动开发服务');
  console.log('默认管理员账号：admin / admin123');
}

main().catch((e) => {
  console.error('\n初始化失败:', e.message);
  process.exit(1);
});
