import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { create } from 'zustand';

import { batchByKey, throttleLatest } from '@/lib/throttle';

import { binance } from './binance';
import { demo } from './demo';
import { server } from './server';
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

const SOURCES: Record<string, MarketSource> = { binance, demo, server };

// Как часто живые данные попадают на экран (мс). Сокет может присылать сотни
// сообщений в секунду — экран обновляется не чаще этого, промежуточные отбрасываются.
export const UI_RATE = { tickers: 250, candles: 100, book: 250 };
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
    // Пачка тикеров за окно → одна запись в кэш → одна перерисовка списка
    const push = batchByKey<Ticker>(
      (t) => t.symbol,
      (batch) => {
        const bySymbol = new Map(batch.map((t) => [t.symbol, t]));
        qc.setQueryData<Ticker[]>(key, (old) => old?.map((o) => bySymbol.get(o.symbol) ?? o));
      },
      UI_RATE.tickers
    );
    const off = useMarketSource
      .getState()
      .source.subscribe({ type: 'tickers', symbols }, (t) => push(t as Ticker));
    return () => {
      off();
      push.cancel();
    };
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
    const push = throttleLatest<Candle>(
      (candle) => setLive({ key: streamKey, candle }),
      UI_RATE.candles
    );
    const off = useMarketSource
      .getState()
      .source.subscribe({ type: 'candles', symbol, tf }, (c) => push(c as Candle));
    return () => {
      off();
      push.cancel();
    };
  }, [ready, symbol, tf, streamKey]);
  return { ...query, live: live?.key === streamKey ? live.candle : null };
}

/** Стакан заявок: живые обновления не чаще UI_RATE.book. */
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
    const push = throttleLatest<OrderBook>(
      (book) => setLive({ key: streamKey, book }),
      UI_RATE.book
    );
    const off = useMarketSource
      .getState()
      .source.subscribe({ type: 'book', symbol }, (b) => push(b as OrderBook));
    return () => {
      off();
      push.cancel();
    };
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
