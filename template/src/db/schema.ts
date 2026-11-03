import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Таблицы локальной базы. После правок: npm run db:generate — создаст миграцию,
// приложение применит её само при следующем запуске.
export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

// Сделки (бумажная торговля и импорт из CSV/Excel). Деньги — строками:
// их считают через Decimal (src/lib/decimal.ts), а не через числа JS.
export const trades = sqliteTable('trades', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  symbol: text('symbol').notNull(),
  side: text('side', { enum: ['buy', 'sell'] }).notNull(),
  price: text('price').notNull(),
  qty: text('qty').notNull(),
  fee: text('fee').notNull().default('0'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type TradeRow = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
