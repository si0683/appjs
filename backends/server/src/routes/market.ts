import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { cached } from '../lib/redis.js';
import { REST, TIMEFRAMES, toBook, toCandle, toTicker } from '../realtime/market.js';

// Рыночные данные через свой сервер: запросы к бирже кэшируются в Redis,
// поэтому 100 000 пользователей — это всё равно несколько запросов к Binance
// в секунду (у бирж жёсткие лимиты по IP).

const symbol = z.string().regex(/^[A-Z0-9]{3,20}$/);

async function binance<T>(path: string): Promise<T> {
  const res = await fetch(REST + path, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`binance ${res.status}`);
  return (await res.json()) as T;
}

export const market = new Hono()
  .get(
    '/tickers',
    zValidator('query', z.object({ symbols: z.string().transform((s) => s.split(',')).pipe(z.array(symbol).max(50)) })),
    async (c) => {
      const { symbols } = c.req.valid('query');
      const key = `cache:tickers:${[...symbols].sort().join(',')}`;
      const data = await cached(key, 2, async () => {
        const raw = await binance<Record<string, string>[]>(`/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`);
        return raw.map(toTicker);
      });
      return c.json(data);
    }
  )
  .get(
    '/candles',
    zValidator(
      'query',
      z.object({
        symbol,
        tf: z.enum(TIMEFRAMES as [string, ...string[]]),
        limit: z.coerce.number().int().min(1).max(1000).default(300),
      })
    ),
    async (c) => {
      const { symbol: s, tf, limit } = c.req.valid('query');
      const data = await cached(`cache:candles:${s}:${tf}:${limit}`, 10, async () =>
        (await binance<(string | number)[][]>(`/klines?symbol=${s}&interval=${tf}&limit=${limit}`)).map(toCandle)
      );
      return c.json(data);
    }
  )
  .get('/book', zValidator('query', z.object({ symbol })), async (c) => {
    const { symbol: s } = c.req.valid('query');
    const data = await cached(`cache:book:${s}`, 1, async () =>
      toBook(await binance(`/depth?symbol=${s}&limit=20`))
    );
    return c.json(data);
  });
