import { APP } from '@/config/app';
import { connectSocket } from '@/lib/ws';

import { demo } from './demo';
import type { Candle, MarketSource, OrderBook, Ticker } from './types';

// Рынок через свой сервер (--backend=server, папка server/): сервер держит одно
// соединение с биржей, кэширует запросы в Redis и раздаёт поток всем клиентам.
// Включить: EXPO_PUBLIC_MARKET_SOURCE=server и EXPO_PUBLIC_API_URL=адрес сервера.

const base = () => `${APP.apiUrl}/api/market`;
const wsUrl = () => APP.apiUrl.replace(/^http/, 'ws') + '/ws';

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(base() + path, { signal });
  if (!res.ok) throw new Error(`server ${res.status}`);
  return res.json() as Promise<T>;
}

export const server: MarketSource = {
  id: 'server',
  tickers: (symbols, signal) => get<Ticker[]>(`/tickers?symbols=${symbols.join(',')}`, signal),
  candles: (symbol, tf, limit, signal) =>
    get<Candle[]>(`/candles?symbol=${symbol}&tf=${tf}&limit=${limit}`, signal),
  orderBook: (symbol, _depth, signal) => get<OrderBook>(`/book?symbol=${symbol}`, signal),
  // Шаги цены и лота — как в демо; в реальном приложении отдавайте их с сервера
  info: (symbol) => demo.info(symbol),
  subscribe(channel, onData) {
    const topics =
      channel.type === 'tickers'
        ? channel.symbols.map((s) => `ticker:${s}`)
        : channel.type === 'candles'
          ? [`candles:${channel.symbol}:${channel.tf}`]
          : [`book:${channel.symbol}`];
    const socket = connectSocket({
      url: wsUrl(),
      onOpen: (send) => send(JSON.stringify({ op: 'sub', topics })),
      onMessage: (msg) => {
        const { topic, data } = msg as { topic?: string; data?: Ticker | Candle | OrderBook };
        if (topic && data && topics.includes(topic)) onData(data);
      },
      ping: { everyMs: 25_000, message: '{"op":"ping"}' },
    });
    return socket.close;
  },
};
