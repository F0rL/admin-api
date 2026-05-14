/**
 * 队列管理服务
 *
 * 基于 BullMQ 的队列创建与管理，内部维护队列单例 Map。
 * 默认配置：3 次重试 + 指数退避 + 7 天自动清理已完成任务 + 30 天自动清理失败任务。
 */

import { Queue, type QueueOptions } from 'bullmq';
import { queueConnection } from './index.js';

const queues = new Map<string, Queue>();

export function createQueue(name: string, opts?: Partial<QueueOptions>): Queue {
  if (queues.has(name)) {
    return queues.get(name)!;
  }

  const queue = new Queue(name, {
    connection: queueConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 3600 * 24 * 7 },
      removeOnFail: { age: 3600 * 24 * 30 },
    },
    ...opts,
  });

  queues.set(name, queue);
  return queue;
}

export function getQueue(name: string): Queue | undefined {
  return queues.get(name);
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all(Array.from(queues.values()).map((q) => q.close()));
  queues.clear();
}
