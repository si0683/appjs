import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

import { auth } from './auth.js';
import { sql } from './db/client.js';
import { env } from './env.js';
import { log } from './lib/logger.js';
import { rateLimit } from './lib/rate-limit.js';
import { redis } from './lib/redis.js';
import { stats } from './realtime/hub.js';
import { market } from './routes/market.js';
import { pages } from './routes/pages.js';
import { tradesRoute } from './routes/trades.js';

// HTTP-приложение (без запуска сервера — так его удобно тестировать).
export const app = new Hono();

app.use(secureHeaders());
app.use(
  '/api/*',
  cors({
    // Приложение на телефоне не шлёт Origin — CORS нужен только веб-версии
    origin: (origin) => (env.TRUSTED_ORIGINS.includes(origin) ? origin : null),
    credentials: true,
  })
);
app.use('/api/*', rateLimit(env.RATE_LIMIT_PER_MINUTE));
app.use(async (c, next) => {
  const t0 = performance.now();
  await next();
  log.debug({ method: c.req.method, path: c.req.path, status: c.res.status, ms: Math.round(performance.now() - t0) });
});

// Живой ли процесс (для перезапуска) и готов ли принимать запросы (для балансировщика)
app.get('/health', (c) => c.json({ ok: true }));
app.get('/ready', async (c) => {
  try {
    await sql`select 1`;
    await redis.ping();
    return c.json({ ok: true, ws: stats() });
  } catch (e) {
    return c.json({ ok: false, error: (e as Error).message }, 503);
  }
});

app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));
app.route('/api/market', market);
app.route('/api/trades', tradesRoute);
app.route('/', pages);

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  log.error({ err, path: c.req.path }, 'ошибка запроса');
  return c.json({ error: 'internal' }, 500);
});
