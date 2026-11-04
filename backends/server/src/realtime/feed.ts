import { randomUUID } from 'node:crypto';

import { env } from '../env.js';
import { log } from '../lib/logger.js';
import { redis } from '../lib/redis.js';
import { fromStream, streamsFor, WS, type MarketEvent } from './market.js';

// Поток биржи. Подключение к Binance держит ОДНА копия сервера (лидер, блокировка
// в Redis) — сколько бы копий ни работало за балансировщиком, биржа видит одно
// соединение. Лидер прореживает поток и публикует в Redis-канал «market»;
// все копии (и он сам) раздают события своим клиентам (hub.ts).

export const CHANNEL = 'market';
const LOCK = 'market:feed:leader';
const LOCK_MS = 15_000;
const PUBLISH_EVERY_MS = 250; // не чаще 4 обновлений в секунду на тему
const id = randomUUID();

let socket: WebSocket | null = null;
let timers: ReturnType<typeof setInterval>[] = [];
let stopped = false;

async function becomeLeader() {
  const ok = await redis.set(LOCK, id, 'PX', LOCK_MS, 'NX');
  if (ok) return true;
  // Мы уже лидер — продлеваем блокировку
  const holder = await redis.get(LOCK);
  if (holder === id) {
    await redis.pexpire(LOCK, LOCK_MS);
    return true;
  }
  return false;
}

function connect() {
  const pending = new Map<string, MarketEvent>();
  const url = WS + streamsFor(env.MARKET_SYMBOLS).join('/');
  socket = new WebSocket(url);
  socket.onopen = () => log.info({ streams: env.MARKET_SYMBOLS.length }, 'feed: подключён к Binance');
  socket.onmessage = (e) => {
    try {
      const { stream, data } = JSON.parse(String(e.data)) as { stream: string; data: Record<string, unknown> };
      const event = fromStream(stream, data);
      if (event) pending.set(event.topic, event); // последнее по теме за окно
    } catch {
      // пропускаем битые сообщения
    }
  };
  socket.onclose = () => {
    socket = null;
    if (!stopped) log.warn('feed: соединение закрыто, переподключение на следующем такте');
  };
  socket.onerror = () => socket?.close();

  timers.push(
    setInterval(async () => {
      if (!pending.size) return;
      const batch = [...pending.values()];
      pending.clear();
      const pipe = redis.pipeline();
      for (const ev of batch) pipe.hset('market:last', ev.topic, JSON.stringify(ev.data));
      pipe.publish(CHANNEL, JSON.stringify(batch));
      await pipe.exec();
    }, PUBLISH_EVERY_MS)
  );
}

/** Запустить цикл выборов лидера. Каждые 5 с: кто держит блокировку — тот и качает поток. */
export function startFeed() {
  if (env.MARKET_FEED === 'off') return () => undefined;
  const tick = async () => {
    try {
      const leader = await becomeLeader();
      if (leader && !socket) connect();
      if (!leader && socket) socket.close();
    } catch (e) {
      log.error({ err: e }, 'feed: ошибка выборов лидера');
    }
  };
  void tick();
  const election = setInterval(tick, 5_000);
  return async () => {
    stopped = true;
    clearInterval(election);
    timers.forEach(clearInterval);
    timers = [];
    socket?.close();
    if ((await redis.get(LOCK)) === id) await redis.del(LOCK);
  };
}
