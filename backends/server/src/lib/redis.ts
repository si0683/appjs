import { Redis } from 'ioredis';

import { env } from '../env.js';

// Redis: кэш, лимиты запросов, раздача событий между копиями сервера (pub/sub)
// и очереди задач (BullMQ). Для подписки нужен отдельный клиент.
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const subscriber = redis.duplicate();

/** Кэш: значение по ключу или посчитать и сохранить на ttl секунд. */
export async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit) as T;
  const value = await load();
  await redis.set(key, JSON.stringify(value), 'EX', ttl);
  return value;
}
