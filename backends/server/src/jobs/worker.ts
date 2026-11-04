import { Worker } from 'bullmq';
import { lt } from 'drizzle-orm';

import { db, sql } from '../db/client.js';
import { session } from '../db/schema.js';
import { log } from '../lib/logger.js';
import { redis } from '../lib/redis.js';
import { jobs, QUEUE, type JobData } from './queue.js';

// Процесс фоновых задач: npm run worker (в Docker — сервис worker).

const handlers: { [K in keyof JobData]: (data: JobData[K]) => Promise<unknown> } = {
  // Запрос удаления со страницы /delete-account. Здесь — отправьте письмо со
  // ссылкой подтверждения (Resend, SMTP, Unisender…), по ссылке — auth.api.deleteUser.
  'delete-request': async ({ email }) => {
    log.info({ email }, 'job: запрос на удаление аккаунта — отправьте письмо с подтверждением');
  },
  // Раз в сутки — удалить истёкшие сессии
  'cleanup-sessions': async () => {
    const res = await db.delete(session).where(lt(session.expiresAt, new Date())).returning({ id: session.id });
    log.info({ removed: res.length }, 'job: очищены истёкшие сессии');
  },
};

const worker = new Worker(
  QUEUE,
  async (job) => {
    const handler = handlers[job.name as keyof JobData] as (d: unknown) => Promise<unknown>;
    if (!handler) throw new Error(`Неизвестная задача ${job.name}`);
    return handler(job.data);
  },
  { connection: redis, concurrency: 10 }
);

worker.on('failed', (job, err) => log.error({ job: job?.name, err }, 'job: ошибка'));
await jobs.upsertJobScheduler('cleanup-sessions-daily', { pattern: '0 4 * * *' }, { name: 'cleanup-sessions' });
log.info('worker: запущен');

const stop = async () => {
  await worker.close();
  await jobs.close();
  await redis.quit();
  await sql.end();
  process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
