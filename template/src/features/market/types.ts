// Общие типы рынка. Любая биржа (Binance, Bybit, OKX, MOEX…) приводится к ним
// в своём адаптере — экраны и графики про конкретную биржу не знают.

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export type Ticker = {
  symbol: string; // BTCUSDT
  base: string; // BTC
  quote: string; // USDT
  last: string; // цена — строкой, считаем через Decimal
  changePercent: string; // за 24 ч
  high: string;
  low: string;
  volumeQuote: string; // оборот в валюте котировки
};

/** Свеча: время — UNIX-секунды начала свечи (так ждёт lightweight-charts). */
export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type BookLevel = { price: string; qty: string };
export type OrderBook = { bids: BookLevel[]; asks: BookLevel[] };

export type SymbolInfo = { tickSize: string; lotStep: string; minQty: string };

/** Адаптер биржи. Новая биржа = новый файл с этим интерфейсом. */
export interface MarketSource {
  id: string;
  tickers(symbols: string[], signal?: AbortSignal): Promise<Ticker[]>;
  candles(symbol: string, tf: Timeframe, limit: number, signal?: AbortSignal): Promise<Candle[]>;
  orderBook(symbol: string, depth: number, signal?: AbortSignal): Promise<OrderBook>;
  info(symbol: string): SymbolInfo;
  /** Живые обновления. Возвращает функцию отписки. */
  subscribe(
    channel:
      | { type: 'tickers'; symbols: string[] }
      | { type: 'candles'; symbol: string; tf: Timeframe }
      | { type: 'book'; symbol: string },
    onData: (data: Ticker | Candle | OrderBook) => void
  ): () => void;
}
