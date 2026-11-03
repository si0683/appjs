import { BollingerBands, EMA, RSI } from 'trading-signals';

import type { Candle } from './types';

// Индикаторы на библиотеке trading-signals (100+ штук: MACD, ATR, Stoch,
// Ichimoku…). Результат — точки { time, value } для линий на графике.

export type LinePoint = { time: number; value: number };
export type Overlay = { id: string; title: string; color: string; points: LinePoint[] };

export function ema(candles: Candle[], period: number): LinePoint[] {
  const ind = new EMA(period);
  const out: LinePoint[] = [];
  for (const c of candles) {
    ind.add(c.close);
    const v = ind.getResult();
    if (v !== null && ind.isStable) out.push({ time: c.time, value: v });
  }
  return out;
}

export function bollinger(candles: Candle[], period = 20, k = 2) {
  const ind = new BollingerBands(period, k);
  const upper: LinePoint[] = [];
  const lower: LinePoint[] = [];
  for (const c of candles) {
    const r = ind.add(c.close);
    if (r) {
      upper.push({ time: c.time, value: r.upper });
      lower.push({ time: c.time, value: r.lower });
    }
  }
  return { upper, lower };
}

export function rsi(candles: Candle[], period = 14): LinePoint[] {
  const ind = new RSI(period);
  const out: LinePoint[] = [];
  for (const c of candles) {
    const v = ind.add(c.close);
    if (v !== null) out.push({ time: c.time, value: v });
  }
  return out;
}

export type IndicatorId = 'ema20' | 'ema50' | 'bb';

/** Линии поверх свечей по выбранным индикаторам. Цвета — из темы графика. */
export function overlays(candles: Candle[], ids: IndicatorId[], colors: string[]): Overlay[] {
  const out: Overlay[] = [];
  if (ids.includes('ema20'))
    out.push({ id: 'ema20', title: 'EMA 20', color: colors[0], points: ema(candles, 20) });
  if (ids.includes('ema50'))
    out.push({ id: 'ema50', title: 'EMA 50', color: colors[1], points: ema(candles, 50) });
  if (ids.includes('bb')) {
    const { upper, lower } = bollinger(candles);
    out.push({ id: 'bbu', title: 'BB ↑', color: colors[2], points: upper });
    out.push({ id: 'bbl', title: 'BB ↓', color: colors[2], points: lower });
  }
  return out;
}
