import { Queue } from 'bullmq';

import { redis } from '../lib/redis.js';

// Фоновые задачи (BullMQ на Redis): письма, отчёты, уведомления о цене,
// очистка. Ставит задачу API, выполняет отдельный процесс worker — его можно
// запускать в нескольких копиях, задачи распределятся сами.
export const QUEUE = 'jobs';
export const jobs = new Queue(QUEUE, { connection: redis });

export type JobData = {
  'delete-request': { email: string; at: number };
  'cleanup-sessions': Record<string, never>;
};
