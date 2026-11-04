import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '../env.js';
import * as schema from './schema.js';

// Пул соединений к PostgreSQL. max — на одну копию сервера; при 10 копиях
// за балансировщиком это 200 соединений — для большего ставьте PgBouncer.
// prepare: false — для PgBouncer в режиме transaction (DB_PREPARE=false).
export const sql = postgres(env.DATABASE_URL, {
  max: env.DB_POOL_MAX,
  idle_timeout: 30,
  prepare: env.DB_PREPARE,
});
export const db = drizzle(sql, { schema });
