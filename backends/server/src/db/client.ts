import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '../env.js';
import * as schema from './schema.js';

// Пул соединений к PostgreSQL. max — на одну копию сервера; при 10 копиях
// за балансировщиком это 200 соединений — для большего ставьте PgBouncer.
export const sql = postgres(env.DATABASE_URL, { max: 20, idle_timeout: 30 });
export const db = drizzle(sql, { schema });
