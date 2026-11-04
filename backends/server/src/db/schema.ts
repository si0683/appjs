import { index, numeric, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

import { user } from './auth-schema.js';

export * from './auth-schema.js';

// Таблицы приложения. После правок: npm run db:generate → миграция применится
// при следующем запуске (npm run migrate / контейнер api делает это сам).

export const tradeSide = pgEnum('trade_side', ['buy', 'sell']);

// Сделки пользователя (журнал из приложения). Деньги — numeric, без потери точности.
export const trades = pgTable(
  'trades',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    symbol: text('symbol').notNull(),
    side: tradeSide('side').notNull(),
    price: numeric('price', { precision: 38, scale: 18 }).notNull(),
    qty: numeric('qty', { precision: 38, scale: 18 }).notNull(),
    fee: numeric('fee', { precision: 38, scale: 18 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('trades_user_time_idx').on(t.userId, t.createdAt)]
);
