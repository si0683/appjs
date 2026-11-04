import type { MiddlewareHandler } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';

import { env } from '../env.js';
import { rateLimited } from './metrics.js';
import { incrWindow } from './redis.js';

/** IP клиента: за своим прокси (TRUST_PROXY=true) — последний адрес в X-Forwarded-For. */
export function clientIp(c: Parameters<MiddlewareHandler>[0]) {
  const forwarded = env.TRUST_PROXY
    ? c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim()
    : undefined;
  return forwarded || getConnInfo(c).remote.address || 'unknown';
}

/** Счётчик в окне: true — лимит превышен. Общий для всех копий (Redis). */
export async function hit(key: string, limit: number, windowSec: number) {
  return (await incrWindow(key, windowSec)) > limit;
}

/**
 * Лимит отправки SMS: 3 кода за 10 минут с одного IP И на один номер.
 * Лимит по номеру защищает от накрутки SMS с разных адресов (SMS pumping).
 */
export const smsLimit: MiddlewareHandler = async (c, next) => {
  let phone = '';
  try {
    phone = String(((await c.req.raw.clone().json()) as { phoneNumber?: string }).phoneNumber ?? '');
  } catch {
    // тело проверит Better Auth
  }
  const byIp = await hit(`sms:ip:${clientIp(c)}`, 3, 600);
  const byPhone = phone ? await hit(`sms:phone:${phone}`, 3, 600) : false;
  if (byIp || byPhone) {
    rateLimited.inc();
    return c.json({ error: 'too_many_requests' }, 429);
  }
  await next();
};

/**
 * Лимит запросов на IP в минуту. Счётчик в Redis — общий для всех копий
 * сервера за балансировщиком. Превышение — 429 и заголовок Retry-After.
 */
export function rateLimit(perMinute: number, prefix = 'rl'): MiddlewareHandler {
  return async (c, next) => {
    const ip = clientIp(c);
    const window = Math.floor(Date.now() / 60_000);
    const count = await incrWindow(`${prefix}:${ip}:${window}`, 61);
    c.header('X-RateLimit-Limit', String(perMinute));
    c.header('X-RateLimit-Remaining', String(Math.max(0, perMinute - count)));
    if (count > perMinute) {
      rateLimited.inc();
      c.header('Retry-After', String(60 - (Math.floor(Date.now() / 1000) % 60)));
      return c.json({ error: 'too_many_requests' }, 429);
    }
    await next();
  };
}
