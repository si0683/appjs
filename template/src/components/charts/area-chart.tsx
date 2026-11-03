import { Circle, LinearGradient, useFont, vec } from '@shopify/react-native-skia';
import * as React from 'react';
import { View } from 'react-native';
import { useAnimatedReaction } from 'react-native-reanimated';
import { Area, CartesianChart, Line, useChartPressState } from 'victory-native';
import { scheduleOnRN } from 'react-native-worklets';

import { useChartTheme, withAlpha } from '@/lib/chart-theme';

const FONT = require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf');

export type AreaPoint = { x: number; y: number };

/**
 * Линия с заливкой (кривая капитала, цена, доходность). Ведите пальцем —
 * onScrub получает точку под пальцем (null — палец убран).
 * Victory Native XL + Skia: 60 fps, работает в Expo Go.
 */
export function AreaChart({
  data,
  height = 220,
  color,
  formatX,
  formatY,
  onScrub,
}: {
  data: AreaPoint[];
  height?: number;
  color?: string;
  formatX?: (x: number) => string;
  formatY?: (y: number) => string;
  onScrub?: (point: AreaPoint | null) => void;
}) {
  const theme = useChartTheme();
  const stroke = color ?? theme.primary;
  const font = useFont(FONT, 10);
  const { state, isActive } = useChartPressState({ x: 0, y: { y: 0 } });

  const report = React.useCallback((p: AreaPoint | null) => onScrub?.(p), [onScrub]);
  useAnimatedReaction(
    () => (isActive ? { x: state.x.value.value, y: state.y.y.value.value } : null),
    (cur, prev) => {
      if (cur?.x !== prev?.x || (cur === null) !== (prev === null)) scheduleOnRN(report, cur);
    },
    [isActive]
  );

  if (data.length < 2) return <View style={{ height }} />;

  return (
    <View style={{ height }}>
      <CartesianChart
        data={data}
        xKey="x"
        yKeys={['y']}
        chartPressState={state}
        padding={{ left: 4, right: 4, bottom: 4 }}
        domainPadding={{ top: 12, bottom: 4 }}
        xAxis={{
          font,
          tickCount: 4,
          labelColor: theme.text,
          lineColor: 'transparent',
          formatXLabel: (x) => (formatX ? formatX(x) : String(x)),
        }}
        yAxis={[
          {
            font,
            tickCount: 4,
            labelColor: theme.text,
            lineColor: theme.grid,
            formatYLabel: (y) => (formatY ? formatY(y) : String(y)),
          },
        ]}
        frame={{ lineColor: 'transparent' }}>
        {({ points, chartBounds }) => (
          <>
            <Area
              points={points.y}
              y0={chartBounds.bottom}
              curveType="natural"
              animate={{ type: 'timing', duration: 300 }}>
              <LinearGradient
                start={vec(0, chartBounds.top)}
                end={vec(0, chartBounds.bottom)}
                colors={[withAlpha(stroke, 0.35), withAlpha(stroke, 0)]}
              />
            </Area>
            <Line
              points={points.y}
              color={stroke}
              strokeWidth={2}
              curveType="natural"
              animate={{ type: 'timing', duration: 300 }}
            />
            {isActive ? (
              <Circle cx={state.x.position} cy={state.y.y.position} r={5} color={stroke} />
            ) : null}
          </>
        )}
      </CartesianChart>
    </View>
  );
}
