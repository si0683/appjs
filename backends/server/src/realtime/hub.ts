import type { WSContext } from 'hono/ws';

import { log } from '../lib/logger.js';
import { redis, subscriber } from '../lib/redis.js';
import { CHANNEL } from './feed.js';
import { isTopic, type MarketEvent } from './market.js';

// Раздача событий клиентам этой копии сервера. Клиент шлёт
//   { "op": "sub",   "topics": ["ticker:BTCUSDT", "candles:BTCUSDT:1h", "book:BTCUSDT"] }
//   { "op": "unsub", "topics": [...] }
// и получает { "topic", "data" }. Медленные клиенты (буфер > 1 МБ) пропускают
// обновления, а не копят очередь — память сервера не растёт.

const MAX_TOPICS = 50;
const MAX_BUFFER = 1_000_000;

type Client = { ws: WSContext; topics: Set<string> };
const clients = new Set<Client>();
const byTopic = new Map<string, Set<Client>>();

export const stats = () => ({ clients: clients.size, topics: byTopic.size });

function send(client: Client, payload: string) {
  const raw = client.ws.raw as { bufferedAmount?: number } | undefined;
  if ((raw?.bufferedAmount ?? 0) > MAX_BUFFER) return;
  client.ws.send(payload);
}

export async function startHub() {
  await subscriber.subscribe(CHANNEL);
  subscriber.on('message', (_channel, message) => {
    const batch = JSON.parse(message) as MarketEvent[];
    for (const ev of batch) {
      const subs = byTopic.get(ev.topic);
      if (!subs?.size) continue;
      const payload = JSON.stringify(ev);
      for (const c of subs) send(c, payload);
    }
  });
}

/** Обработчики WebSocket для Hono (upgradeWebSocket). */
export function socketHandlers() {
  const client: Client = { ws: null as unknown as WSContext, topics: new Set() };
  return {
    onOpen(_: Event, ws: WSContext) {
      client.ws = ws;
      clients.add(client);
    },
    async onMessage(event: MessageEvent, ws: WSContext) {
      let msg: { op?: string; topics?: unknown };
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return ws.send(JSON.stringify({ error: 'bad_json' }));
      }
      const topics = Array.isArray(msg.topics) ? msg.topics.filter((t): t is string => typeof t === 'string' && isTopic(t)) : [];
      if (msg.op === 'sub') {
        const fresh = topics.filter((t) => !client.topics.has(t)).slice(0, MAX_TOPICS - client.topics.size);
        for (const t of fresh) {
          client.topics.add(t);
          if (!byTopic.has(t)) byTopic.set(t, new Set());
          byTopic.get(t)!.add(client);
        }
        // Сразу отдаём последнее известное значение — экран не ждёт следующего тика
        if (fresh.length) {
          const last = await redis.hmget('market:last', ...fresh);
          fresh.forEach((t, i) => last[i] && send(client, `{"topic":"${t}","data":${last[i]}}`));
        }
      } else if (msg.op === 'unsub') {
        for (const t of topics) {
          client.topics.delete(t);
          byTopic.get(t)?.delete(client);
        }
      } else if (msg.op === 'ping') {
        ws.send('{"op":"pong"}');
      }
    },
    onClose() {
      clients.delete(client);
      for (const t of client.topics) {
        const set = byTopic.get(t);
        set?.delete(client);
        if (set && !set.size) byTopic.delete(t);
      }
    },
    onError(err: Event) {
      log.debug({ err }, 'ws: ошибка клиента');
    },
  };
}
