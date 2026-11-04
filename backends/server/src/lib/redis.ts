import { Redis } from 'ioredis';

import { env } from '../env.js';

// Redis: кэш, лимиты запросов, раздача событий между копиями сервера (pub/sub)
// и очереди задач (BullMQ). Для подписки нужен отдельный клиент.
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const subscriber = redis.duplicate();

// Счётчик в окне одной операцией: создать с TTL или увеличить (атомарно для всех копий)
const INCR_WITH_TTL = "local n = redis.call('INCR', KEYS[1]) if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end return n";
export const incrWindow = async (key: string, ttlSec: number) =>
  Number(await redis.eval(INCR_WITH_TTL, 1, key, ttlSec));

/**
 * Хранилище Better Auth в Redis: его лимиты запросов и служебные записи общие
 * для всех копий сервера (иначе у каждой копии свой счётчик в памяти).
 */
export const authStorage = {
  get: (key: string) => redis.get(`auth:${key}`),
  getAndDelete: (key: string) => redis.getdel(`auth:${key}`),
  increment: (key: string, ttl: number) => incrWindow(`auth:${key}`, ttl),
  set: (key: string, value: string, ttl?: number) =>
    ttl ? redis.set(`auth:${key}`, value, 'EX', ttl) : redis.set(`auth:${key}`, value),
  delete: async (key: string) => {
    await redis.del(`auth:${key}`);
  },
};

// Обновления, которые уже идут: одновременные запросы ждут один и тот же результат,
// а не идут к бирже все сразу (защита от «лавины промахов»)
const inflight = new Map<string, Promise<unknown>>();

/**
 * Кэш «отдать сразу, обновить в фоне» (stale-while-revalidate): свежее ttl секунд,
 * потом ещё до stale секунд отдаём старое значение и одновременно обновляем его
 * одним запросом. Пользователь не ждёт биржу, биржа видит редкие запросы.
 */
export async function cached<T>(
  key: string,
  ttl: number,
  load: () => Promise<T>,
  stale = ttl * 10
): Promise<T> {
  const hit = await redis.get(key);
  if (hit) {
    const { at, value } = JSON.parse(hit) as { at: number; value: T };
    if (Date.now() - at > ttl * 1000) void refresh(key, ttl + stale, load).catch(() => undefined);
    return value;
  }
  return refresh(key, ttl + stale, load);
}

function refresh<T>(key: string, keep: number, load: () => Promise<T>): Promise<T> {
  const running = inflight.get(key);
  if (running) return running as Promise<T>;
  const task = (async () => {
    try {
      const value = await load();
      await redis.set(key, JSON.stringify({ at: Date.now(), value }), 'EX', keep);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, task);
  return task;
}
