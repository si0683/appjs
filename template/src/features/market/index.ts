import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { create } from 'zustand';

import { binance } from './binance';
import { demo } from './demo';
import type { Candle, MarketSource, OrderBook, Ticker, Timeframe } from './types';

export * from './types';

// Какие инструменты показываем. Свой список — здесь или в настройках пользователя.
export const WATCHLIST = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'TONUSDT',
  'DOGEUSDT',
  'ADAUSDT',
];

const SOURCES: Record<string, MarketSource> = { binance, demo };
const preferred = SOURCES[process.env.EXPO_PUBLIC_MARKET_SOURCE ?? 'binance'] ?? binance;

// Если биржа недоступна (нет сети, блокировка) — переключаемся на демо и
// показываем это пользователю. Кнопка «Повторить» возвращает биржу.
export const useMarketSource = create<{
  source: MarketSource;
  fallback: boolean;
  switchToDemo: () => void;
  retry: () => void;
}>((set) => ({
  source: preferred,
  fallback: false,
  switchToDemo: () => set({ source: demo, fallback: preferred !== demo }),
  retry: () => set({ source: preferred, fallback: false }),
}));

async function withFallback<T>(run: (s: MarketSource) => Promise<T>): Promise<T> {
  const { source, switchToDemo } = useMarketSource.getState();
  try {
    return await run(source);
  } catch (e) {
    if (source === demo || (e as Error).name === 'AbortError') throw e;
    switchToDemo();
    return run(demo);
  }
}

const sourceId = () => useMarketSource.getState().source.id;

/** Список тикеров + живые обновления цен (WebSocket пишет прямо в кэш Query). */
export function useTickers(symbols = WATCHLIST) {
  const qc = useQueryClient();
  const id = useMarketSource((s) => s.source.id);
  const key = React.useMemo(() => ['tickers', id, symbols.join(',')], [id, symbols]);
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => withFallback((s) => s.tickers(symbols, signal)),
    staleTime: 30_000,
  });
  const ready = query.isSuccess;
  React.useEffect(() => {
    if (!ready) return;
    return useMarketSource.getState().source.subscribe({ type: 'tickers', symbols }, (t) => {
      const ticker = t as Ticker;
      qc.setQueryData<Ticker[]>(key, (old) =>
        old?.map((o) => (o.symbol === ticker.symbol ? ticker : o))
      );
    });
  }, [ready, key, qc, symbols]);
  return query;
}

/** Свечи + обновление последней свечи в реальном времени. */
export function useCandles(symbol: string, tf: Timeframe, limit = 300) {
  const id = useMarketSource((s) => s.source.id);
  const query = useQuery({
    queryKey: ['candles', id, symbol, tf, limit],
    queryFn: ({ signal }) => withFallback((s) => s.candles(symbol, tf, limit, signal)),
    staleTime: 60_000,
  });
  // Живая свеча помнит, к какому графику относится: при смене символа или
  // таймфрейма старая просто перестаёт подходить — сбрасывать не нужно.
  const streamKey = `${id}|${symbol}|${tf}`;
  const [live, setLive] = React.useState<{ key: string; candle: Candle } | null>(null);
  const ready = query.isSuccess;
  React.useEffect(() => {
    if (!ready) return;
    return useMarketSource
      .getState()
      .source.subscribe({ type: 'candles', symbol, tf }, (c) =>
        setLive({ key: streamKey, candle: c as Candle })
      );
  }, [ready, symbol, tf, streamKey]);
  return { ...query, live: live?.key === streamKey ? live.candle : null };
}

/** Стакан заявок, обновляется раз в секунду. */
export function useOrderBook(symbol: string) {
  const id = useMarketSource((s) => s.source.id);
  const query = useQuery({
    queryKey: ['book', id, symbol],
    queryFn: ({ signal }) => withFallback((s) => s.orderBook(symbol, 20, signal)),
  });
  const streamKey = `${id}|${symbol}`;
  const [live, setLive] = React.useState<{ key: string; book: OrderBook } | null>(null);
  const ready = query.isSuccess;
  React.useEffect(() => {
    if (!ready) return;
    return useMarketSource
      .getState()
      .source.subscribe({ type: 'book', symbol }, (b) =>
        setLive({ key: streamKey, book: b as OrderBook })
      );
  }, [ready, symbol, streamKey]);
  return { ...query, data: (live?.key === streamKey ? live.book : null) ?? query.data };
}

export const symbolInfo = (symbol: string) => SOURCES[sourceId()].info(symbol);

/** Цены закрытия для мини-графика в списке (без живых обновлений). */
export function useSparkline(symbol: string) {
  const id = useMarketSource((s) => s.source.id);
  return useQuery({
    queryKey: ['spark', id, symbol],
    queryFn: ({ signal }) =>
      withFallback((s) => s.candles(symbol, '1h', 24, signal)).then((c) => c.map((x) => x.close)),
    staleTime: 5 * 60_000,
  });
}
