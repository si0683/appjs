import { TIMEFRAME_SECONDS, splitSymbol } from './binance';
import type { Candle, MarketSource, OrderBook, Ticker, Timeframe } from './types';

// Офлайн-рынок: правдоподобные цены без интернета (случайное блуждание с
// постоянным зерном — одинаковые свечи при каждом запуске). Включается сам,
// если биржа недоступна, или EXPO_PUBLIC_MARKET_SOURCE=demo.

const BASE: Record<string, number> = {
  BTCUSDT: 64000,
  ETHUSDT: 3200,
  SOLUSDT: 150,
  BNBUSDT: 580,
  XRPUSDT: 0.6,
  TONUSDT: 5.5,
  DOGEUSDT: 0.15,
  ADAUSDT: 0.45,
};

function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

const digits = (p: number) => (p >= 1000 ? 2 : p >= 1 ? 4 : 6);
const round = (p: number) => Number(p.toFixed(digits(p)));

// История строится НАЗАД от текущей цены — все таймфреймы заканчиваются
// на одной и той же «живой» цене и стыкуются с тикером.
function generate(symbol: string, tf: Timeframe, limit: number): Candle[] {
  const step = TIMEFRAME_SECONDS[tf];
  const now = Math.floor(Date.now() / 1000);
  const last = now - (now % step);
  const rnd = seeded(hash(symbol + tf));
  const vol = 0.003 * Math.sqrt(step / 60) ** 0.6;
  const base = BASE[symbol] ?? 10;
  let close = lastPrice(symbol);
  const out: Candle[] = [];
  for (let i = 0; i < limit; i++) {
    const open = Math.max(close * (1 - (rnd() - 0.5) * 2 * vol), base * 0.2);
    const high = Math.max(open, close) * (1 + rnd() * vol * 0.6);
    const low = Math.min(open, close) * (1 - rnd() * vol * 0.6);
    out.push({
      time: last - i * step,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume: Math.round((50 + rnd() * 200) * (100000 / base) * 100) / 100,
    });
    close = open;
  }
  return out.reverse();
}

// Текущая «живая» цена каждого символа — меняется таймером
const live = new Map<string, number>();
function lastPrice(symbol: string) {
  if (!live.has(symbol)) live.set(symbol, BASE[symbol] ?? 10);
  return live.get(symbol)!;
}
function tick(symbol: string) {
  const p = lastPrice(symbol);
  const next = round(p * (1 + (Math.random() - 0.5) * 0.0015));
  live.set(symbol, next);
  return next;
}

function ticker(symbol: string): Ticker {
  const day = generate(symbol, '1h', 24);
  const last = lastPrice(symbol);
  const open = day[0].open;
  return {
    symbol,
    ...splitSymbol(symbol),
    last: String(last),
    changePercent: (((last - open) / open) * 100).toFixed(2),
    high: String(Math.max(last, ...day.map((c) => c.high))),
    low: String(Math.min(last, ...day.map((c) => c.low))),
    volumeQuote: String(Math.round(day.reduce((s, c) => s + c.volume * c.close, 0))),
  };
}

function book(symbol: string, depth: number): OrderBook {
  const mid = lastPrice(symbol);
  const tickSize = mid >= 1000 ? 0.1 : mid >= 1 ? 0.001 : 0.00001;
  const d = digits(mid);
  const level = (i: number, side: 1 | -1) => ({
    price: (mid + side * (i + 1) * tickSize * (1 + Math.random())).toFixed(d),
    qty: (Math.random() * (10000 / mid) * (1 + i / 4)).toFixed(mid >= 1000 ? 5 : 2),
  });
  return {
    bids: Array.from({ length: depth }, (_, i) => level(i, -1)),
    asks: Array.from({ length: depth }, (_, i) => level(i, 1)),
  };
}

export const demo: MarketSource = {
  id: 'demo',
  async tickers(symbols) {
    return symbols.map(ticker);
  },
  async candles(symbol, tf, limit) {
    return generate(symbol, tf, limit);
  },
  async orderBook(symbol, depth) {
    return book(symbol, depth);
  },
  info(symbol) {
    const p = BASE[symbol] ?? 10;
    return p >= 1000
      ? { tickSize: '0.01', lotStep: '0.00001', minQty: '0.00001' }
      : p >= 1
        ? { tickSize: '0.0001', lotStep: '0.001', minQty: '0.001' }
        : { tickSize: '0.000001', lotStep: '1', minQty: '1' };
  },
  subscribe(channel, onData) {
    let current: Candle | null =
      channel.type === 'candles' ? generate(channel.symbol, channel.tf, 1)[0] : null;
    const timer = setInterval(() => {
      if (channel.type === 'tickers') {
        for (const s of channel.symbols) {
          tick(s);
          onData(ticker(s));
        }
      } else if (channel.type === 'candles') {
        const close = tick(channel.symbol);
        const step = TIMEFRAME_SECONDS[channel.tf];
        const now = Math.floor(Date.now() / 1000);
        const time = now - (now % step);
        const c: Candle =
          current && current.time === time
            ? current
            : { time, open: current?.close ?? close, high: close, low: close, close, volume: 0 };
        current = {
          ...c,
          high: Math.max(c.high, close),
          low: Math.min(c.low, close),
          close,
          volume: Math.round((c.volume + Math.random() * 3) * 100) / 100,
        };
        onData(current);
      } else {
        onData(book(channel.symbol, 20));
      }
    }, 1000);
    return () => clearInterval(timer);
  },
};
