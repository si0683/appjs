'use dom';

// Профессиональный биржевой график — TradingView Lightweight Charts
// (свечи, объём, линии индикаторов, перекрестие, зум и прокрутка пальцами).
// 'use dom' — компонент работает как веб-страница внутри приложения (Expo DOM
// components): на телефоне в WebView, в браузере — как есть. Работает в Expo Go.
// Пропсы должны быть простыми данными (JSON): массивы, числа, строки.

import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import * as React from 'react';

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
type Overlay = {
  id: string;
  title: string;
  color: string;
  points: { time: number; value: number }[];
};
type Theme = {
  background: string;
  text: string;
  grid: string;
  border: string;
  up: string;
  down: string;
};

export default function CandleChart({
  candles,
  live,
  overlays = [],
  theme,
  digits = 2,
  height = 360,
}: {
  candles: Candle[];
  live?: Candle | null;
  overlays?: Overlay[];
  theme: Theme;
  digits?: number;
  height?: number;
  dom?: import('expo/dom').DOMProps;
}) {
  const box = React.useRef<HTMLDivElement>(null);
  const chart = React.useRef<IChartApi | null>(null);
  const candleSeries = React.useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeries = React.useRef<ISeriesApi<'Histogram'> | null>(null);
  const lines = React.useRef<ISeriesApi<'Line'>[]>([]);

  // Создаём график один раз
  React.useEffect(() => {
    if (!box.current) return;
    const c = createChart(box.current, {
      autoSize: true,
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: true, secondsVisible: false, rightOffset: 4 },
      rightPriceScale: { scaleMargins: { top: 0.08, bottom: 0.25 } },
      handleScale: { axisPressedMouseMove: true, pinch: true, mouseWheel: true },
    });
    candleSeries.current = c.addSeries(CandlestickSeries, { borderVisible: false });
    volumeSeries.current = c.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    c.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    chart.current = c;
    return () => {
      c.remove();
      chart.current = null;
    };
  }, []);

  // Тема и точность цены
  React.useEffect(() => {
    chart.current?.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: theme.background },
        textColor: theme.text,
        fontFamily: 'Inter, system-ui, sans-serif',
        attributionLogo: false,
      },
      grid: { vertLines: { color: theme.grid }, horzLines: { color: theme.grid } },
      rightPriceScale: { borderColor: theme.border },
      timeScale: { borderColor: theme.border },
    });
    candleSeries.current?.applyOptions({
      upColor: theme.up,
      downColor: theme.down,
      wickUpColor: theme.up,
      wickDownColor: theme.down,
      priceFormat: { type: 'price', precision: digits, minMove: 1 / 10 ** digits },
    });
  }, [theme, digits]);

  // История свечей
  React.useEffect(() => {
    candleSeries.current?.setData(candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })));
    volumeSeries.current?.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: (c.close >= c.open ? theme.up : theme.down) + '55',
      }))
    );
    chart.current?.timeScale().scrollToRealTime();
  }, [candles, theme]);

  // Живая свеча — точечное обновление без перерисовки всей истории
  React.useEffect(() => {
    if (!live || !candles.length || live.time < candles[candles.length - 1].time) return;
    const time = live.time as UTCTimestamp;
    candleSeries.current?.update({ ...live, time });
    volumeSeries.current?.update({
      time,
      value: live.volume,
      color: (live.close >= live.open ? theme.up : theme.down) + '55',
    });
  }, [live, candles, theme]);

  // Индикаторы
  React.useEffect(() => {
    const c = chart.current;
    if (!c) return;
    lines.current.forEach((s) => c.removeSeries(s));
    lines.current = overlays.map((o) => {
      const s = c.addSeries(LineSeries, {
        color: o.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        title: o.title,
      });
      s.setData(o.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      return s;
    });
  }, [overlays]);

  return (
    <div
      ref={box}
      style={{ width: '100%', height, background: theme.background, touchAction: 'none' }}
    />
  );
}
