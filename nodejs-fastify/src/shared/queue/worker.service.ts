import { Worker, type WorkerOptions, type Job } from 'bullmq';
import { queueConnection } from './index.js';

const workers: Worker[] = [];

export interface JobHandler {
  (job: Job): Promise<unknown>;
}

export function createWorker(
  queueName: string,
  handler: JobHandler,
  opts?: Partial<WorkerOptions>,
): Worker {
  const worker = new Worker(queueName, handler, {
    connection: queueConnection,
    concurrency: 5,
    ...opts,
  });

  worker.on('failed', (job, err) => {
    console.error(`[Queue] Job ${job?.id} in ${queueName} failed:`, err.message);
  });

  workers.push(worker);
  return worker;
}

export async function closeAllWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  workers.length = 0;
}
