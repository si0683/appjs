import { connectSocket } from '@/lib/ws';

import type { Candle, MarketSource, OrderBook, SymbolInfo, Ticker, Timeframe } from './types';

// Публичные рыночные данные Binance — без ключей и регистрации.
// data-api.binance.vision / data-stream.binance.vision — зеркала только для
// рыночных данных. Торговые запросы (ордера) требуют ключей и делаются
// на вашем сервере, а не в приложении: ключ в приложении достанет любой.
const REST = 'https://data-api.binance.vision/api/v3';
const WS = 'wss://data-stream.binance.vision/stream?streams=';

const QUOTES = ['USDT', 'USDC', 'FDUSD', 'BTC', 'ETH', 'EUR', 'TRY'];
export function splitSymbol(symbol: string) {
  const quote = QUOTES.find((q) => symbol.endsWith(q)) ?? symbol.slice(-4);
  return { base: symbol.slice(0, -quote.length), quote };
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${REST}${path}`, { signal });
  if (!res.ok) throw new Error(`Binance ${res.status}`);
  return res.json() as Promise<T>;
}

type RawTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  quoteVolume: string;
};

const toTicker = (t: RawTicker): Ticker => ({
  symbol: t.symbol,
  ...splitSymbol(t.symbol),
  last: t.lastPrice,
  changePercent: t.priceChangePercent,
  high: t.highPrice,
  low: t.lowPrice,
  volumeQuote: t.quoteVolume,
});

type RawKline = [number, string, string, string, string, string, ...unknown[]];
const toCandle = (k: RawKline): Candle => ({
  time: Math.floor(k[0] / 1000),
  open: +k[1],
  high: +k[2],
  low: +k[3],
  close: +k[4],
  volume: +k[5],
});

// Шаги цены и лота — упрощённо по цене. В реальном приложении берите
// их из /exchangeInfo (filters PRICE_FILTER и LOT_SIZE) и кэшируйте.
const INFO: Record<string, SymbolInfo> = {
  BTCUSDT: { tickSize: '0.01', lotStep: '0.00001', minQty: '0.00001' },
  ETHUSDT: { tickSize: '0.01', lotStep: '0.0001', minQty: '0.0001' },
};

export const binance: MarketSource = {
  id: 'binance',

  async tickers(symbols, signal) {
    const list = encodeURIComponent(JSON.stringify(symbols));
    const raw = await get<RawTicker[]>(`/ticker/24hr?symbols=${list}`, signal);
    return symbols
      .map((s) => raw.find((r) => r.symbol === s))
      .filter(Boolean)
      .map((r) => toTicker(r!));
  },

  async candles(symbol, tf, limit, signal) {
    const raw = await get<RawKline[]>(
      `/klines?symbol=${symbol}&interval=${tf}&limit=${limit}`,
      signal
    );
    return raw.map(toCandle);
  },

  async orderBook(symbol, depth, signal) {
    const raw = await get<{ bids: [string, string][]; asks: [string, string][] }>(
      `/depth?symbol=${symbol}&limit=${depth}`,
      signal
    );
    return {
      bids: raw.bids.map(([price, qty]) => ({ price, qty })),
      asks: raw.asks.map(([price, qty]) => ({ price, qty })),
    };
  },

  info(symbol) {
    return INFO[symbol] ?? { tickSize: '0.0001', lotStep: '0.01', minQty: '0.01' };
  },

  subscribe(channel, onData) {
    const streams =
      channel.type === 'tickers'
        ? channel.symbols.map((s) => `${s.toLowerCase()}@ticker`)
        : channel.type === 'candles'
          ? [`${channel.symbol.toLowerCase()}@kline_${channel.tf}`]
          : [`${channel.symbol.toLowerCase()}@depth20@1000ms`];

    const socket = connectSocket({
      url: WS + streams.join('/'),
      onMessage: (msg) => {
        const { data } = msg as { data: Record<string, unknown> };
        if (!data) return;
        if (channel.type === 'tickers') {
          const d = data as Record<string, string>;
          onData(
            toTicker({
              symbol: d.s,
              lastPrice: d.c,
              priceChangePercent: d.P,
              highPrice: d.h,
              lowPrice: d.l,
              quoteVolume: d.q,
            })
          );
        } else if (channel.type === 'candles') {
          const k = data.k as Record<string, string | number>;
          onData({
            time: Math.floor(Number(k.t) / 1000),
            open: +k.o,
            high: +k.h,
            low: +k.l,
            close: +k.c,
            volume: +k.v,
          });
        } else {
          const d = data as { bids: [string, string][]; asks: [string, string][] };
          const book: OrderBook = {
            bids: d.bids.map(([price, qty]) => ({ price, qty })),
            asks: d.asks.map(([price, qty]) => ({ price, qty })),
          };
          onData(book);
        }
      },
    });
    return socket.close;
  },
};

export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};
