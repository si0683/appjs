import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { db, sql } from './client.js';

// Применяет миграции из drizzle/ (их создаёт npm run db:generate).
// В Docker контейнер api запускает это перед стартом.
const folder = join(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

await migrate(db, { migrationsFolder: folder });
console.log('✔ Миграции применены');
await sql.end();
