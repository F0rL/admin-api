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
