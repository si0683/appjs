import { describe, expect, it } from 'vitest';

import { fromStream, isTopic, splitSymbol, streamsFor } from '../src/realtime/market.js';

describe('рынок', () => {
  it('тема подписки проверяется строго', () => {
    expect(isTopic('ticker:BTCUSDT')).toBe(true);
    expect(isTopic('candles:ETHUSDT:1h')).toBe(true);
    expect(isTopic('candles:ETHUSDT:2h')).toBe(false);
    expect(isTopic('book:btcusdt')).toBe(false);
    expect(isTopic('ticker:BTC;DROP')).toBe(false);
  });

  it('символ → база и котировка', () => {
    expect(splitSymbol('BTCUSDT')).toEqual({ base: 'BTC', quote: 'USDT' });
    expect(splitSymbol('ETHBTC')).toEqual({ base: 'ETH', quote: 'BTC' });
  });

  it('поток Binance → события приложения', () => {
    const t = fromStream('btcusdt@ticker', { c: '64000.1', P: '1.5', h: '65000', l: '63000', q: '1000' });
    expect(t).toEqual({
      topic: 'ticker:BTCUSDT',
      data: { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', last: '64000.1', changePercent: '1.5', high: '65000', low: '63000', volumeQuote: '1000' },
    });
    const k = fromStream('ethusdt@kline_1h', { k: { t: 1_700_000_000_000, o: '1', h: '2', l: '0.5', c: '1.5', v: '10' } });
    expect(k).toEqual({ topic: 'candles:ETHUSDT:1h', data: { time: 1_700_000_000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 } });
    const b = fromStream('btcusdt@depth20@1000ms', { bids: [['1', '2']], asks: [['3', '4']] });
    expect(b?.topic).toBe('book:BTCUSDT');
  });

  it('потоки на символ: тикер, стакан и 6 таймфреймов', () => {
    expect(streamsFor(['BTCUSDT'])).toHaveLength(8);
  });
});
