// Рынок: типы — те же, что в приложении (src/features/market/types.ts),
// чтобы адаптер «server» в приложении был тонким.

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
export const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

export type Ticker = {
  symbol: string;
  base: string;
  quote: string;
  last: string;
  changePercent: string;
  high: string;
  low: string;
  volumeQuote: string;
};
export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
export type OrderBook = { bids: { price: string; qty: string }[]; asks: { price: string; qty: string }[] };

/** Темы подписки клиента: ticker:BTCUSDT, candles:BTCUSDT:1h, book:BTCUSDT */
export type Topic = `ticker:${string}` | `candles:${string}:${Timeframe}` | `book:${string}`;
export type MarketEvent = { topic: Topic; data: Ticker | Candle | OrderBook };

export const REST = 'https://data-api.binance.vision/api/v3';
export const WS = 'wss://data-stream.binance.vision/stream?streams=';

const QUOTES = ['USDT', 'USDC', 'FDUSD', 'BTC', 'ETH', 'EUR', 'TRY'];
export function splitSymbol(symbol: string) {
  const quote = QUOTES.find((q) => symbol.endsWith(q)) ?? symbol.slice(-4);
  return { base: symbol.slice(0, -quote.length), quote };
}

export const toTicker = (t: Record<string, string>): Ticker => ({
  symbol: t.symbol,
  ...splitSymbol(t.symbol),
  last: t.lastPrice,
  changePercent: t.priceChangePercent,
  high: t.highPrice,
  low: t.lowPrice,
  volumeQuote: t.quoteVolume,
});

export const toCandle = (k: (string | number)[]): Candle => ({
  time: Math.floor(Number(k[0]) / 1000),
  open: +k[1],
  high: +k[2],
  low: +k[3],
  close: +k[4],
  volume: +k[5],
});

export const toBook = (d: { bids: [string, string][]; asks: [string, string][] }): OrderBook => ({
  bids: d.bids.map(([price, qty]) => ({ price, qty })),
  asks: d.asks.map(([price, qty]) => ({ price, qty })),
});

/** Сообщение потока Binance → событие для клиентов. */
export function fromStream(stream: string, data: Record<string, unknown>): MarketEvent | null {
  const [name, kind] = stream.split('@');
  const symbol = name.toUpperCase();
  if (kind === 'ticker') {
    const d = data as Record<string, string>;
    return {
      topic: `ticker:${symbol}`,
      data: toTicker({
        symbol,
        lastPrice: d.c,
        priceChangePercent: d.P,
        highPrice: d.h,
        lowPrice: d.l,
        quoteVolume: d.q,
      }),
    };
  }
  if (kind?.startsWith('kline_')) {
    const k = data.k as Record<string, string | number>;
    const tf = kind.slice(6) as Timeframe;
    return {
      topic: `candles:${symbol}:${tf}`,
      data: toCandle([k.t, k.o, k.h, k.l, k.c, k.v]),
    };
  }
  if (kind?.startsWith('depth')) {
    return { topic: `book:${symbol}`, data: toBook(data as Parameters<typeof toBook>[0]) };
  }
  return null;
}

export function streamsFor(symbols: string[]) {
  return symbols.flatMap((s) => {
    const n = s.toLowerCase();
    return [`${n}@ticker`, `${n}@depth20@1000ms`, ...TIMEFRAMES.map((tf) => `${n}@kline_${tf}`)];
  });
}

export function isTopic(value: string): value is Topic {
  return /^(ticker:[A-Z0-9]+|book:[A-Z0-9]+|candles:[A-Z0-9]+:(1m|5m|15m|1h|4h|1d))$/.test(value);
}
