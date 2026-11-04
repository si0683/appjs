import type { MiddlewareHandler } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';

import { redis } from './redis.js';

/**
 * Лимит запросов на IP в минуту. Счётчик в Redis — общий для всех копий
 * сервера за балансировщиком. Превышение — 429 и заголовок Retry-After.
 */
export function rateLimit(perMinute: number, prefix = 'rl'): MiddlewareHandler {
  return async (c, next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      getConnInfo(c).remote.address ||
      'unknown';
    const window = Math.floor(Date.now() / 60_000);
    const key = `${prefix}:${ip}:${window}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 61);
    c.header('X-RateLimit-Limit', String(perMinute));
    c.header('X-RateLimit-Remaining', String(Math.max(0, perMinute - count)));
    if (count > perMinute) {
      c.header('Retry-After', String(60 - (Math.floor(Date.now() / 1000) % 60)));
      return c.json({ error: 'too_many_requests' }, 429);
    }
    await next();
  };
}
