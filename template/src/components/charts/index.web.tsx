import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import * as React from 'react';
import { View } from 'react-native';

import type { AreaChart as AreaChartT } from './area-chart';
import type { BarChart as BarChartT } from './bar-chart';
import type { PieChart as PieChartT } from './pie-chart';
import type { Sparkline as SparklineT } from './sparkline';

// Веб-версия: Skia работает через CanvasKit (WebAssembly, public/canvaskit.wasm —
// копируется командой npm install). Модули графиков грузятся только после него.
const opts = { locateFile: () => '/canvaskit.wasm' };

function lazySkia<P extends object>(
  load: () => Promise<React.ComponentType<P>>,
  fallbackHeight: (p: P) => number
) {
  const getComponent = () => load().then((C) => ({ default: C }));
  return function SkiaWebChart(props: P) {
    return (
      <WithSkiaWeb
        opts={opts}
        getComponent={getComponent}
        componentProps={props}
        fallback={<View style={{ height: fallbackHeight(props) }} />}
      />
    );
  };
}

export const AreaChart = lazySkia<React.ComponentProps<typeof AreaChartT>>(
  () => import('./area-chart').then((m) => m.AreaChart),
  (p) => p.height ?? 220
);
export const BarChart = lazySkia<React.ComponentProps<typeof BarChartT>>(
  () => import('./bar-chart').then((m) => m.BarChart),
  (p) => p.height ?? 180
);
export const PieChart = lazySkia<React.ComponentProps<typeof PieChartT>>(
  () => import('./pie-chart').then((m) => m.PieChart),
  (p) => p.size ?? 180
);
export const Sparkline = lazySkia<React.ComponentProps<typeof SparklineT>>(
  () => import('./sparkline').then((m) => m.Sparkline),
  (p) => p.height ?? 28
);

export type { AreaPoint } from './area-chart';
export type { BarPoint } from './bar-chart';
export type { PieSlice } from './pie-chart';
export { default as CandleChart } from './candle-chart';
