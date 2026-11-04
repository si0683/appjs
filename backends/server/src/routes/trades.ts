import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, lt } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../db/client.js';
import { trades } from '../db/schema.js';
import type { AuthEnv } from '../lib/session.js';
import { requireUser } from '../lib/session.js';

// Журнал сделок пользователя (синхронизация с приложением). Только свои записи:
// userId берётся из сессии, а не из запроса.

const decimal = z.string().regex(/^\d+(\.\d+)?$/, 'decimal');
export const tradeInput = z.object({
  symbol: z.string().regex(/^[A-Z0-9]{3,20}$/),
  side: z.enum(['buy', 'sell']),
  price: decimal,
  qty: decimal,
  fee: decimal.default('0'),
  createdAt: z.coerce.date(),
});

export const tradesRoute = new Hono<AuthEnv>()
  .use(requireUser)
  // Постранично: ?limit=50 (до 200), следующая страница — ?before=<id последней записи>.
  // Без этого список растёт вместе с журналом и каждый ответ становится тяжелее.
  .get(
    '/',
    zValidator(
      'query',
      z.object({
        limit: z.coerce.number().int().min(1).max(200).default(50),
        before: z.coerce.number().int().positive().optional(),
      })
    ),
    async (c) => {
      const { limit, before } = c.req.valid('query');
      const rows = await db
        .select()
        .from(trades)
        .where(
          before
            ? and(eq(trades.userId, c.var.user.id), lt(trades.id, before))
            : eq(trades.userId, c.var.user.id)
        )
        .orderBy(desc(trades.id))
        .limit(limit);
      return c.json({ items: rows, next: rows.length === limit ? rows[rows.length - 1].id : null });
    }
  )
  .post('/', zValidator('json', z.object({ items: z.array(tradeInput).min(1).max(500) })), async (c) => {
    const { items } = c.req.valid('json');
    const rows = await db
      .insert(trades)
      .values(items.map((t) => ({ ...t, userId: c.var.user.id })))
      .returning({ id: trades.id });
    return c.json({ inserted: rows.length }, 201);
  })
  .delete('/:id', zValidator('param', z.object({ id: z.coerce.number().int() })), async (c) => {
    const { id } = c.req.valid('param');
    const res = await db
      .delete(trades)
      .where(and(eq(trades.id, id), eq(trades.userId, c.var.user.id)))
      .returning({ id: trades.id });
    return res.length ? c.json({ ok: true }) : c.json({ error: 'not_found' }, 404);
  });
