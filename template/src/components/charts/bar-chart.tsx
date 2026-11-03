import { useFont } from '@shopify/react-native-skia';
import * as React from 'react';
import { View } from 'react-native';
import { Bar, CartesianChart } from 'victory-native';

import { useChartTheme } from '@/lib/chart-theme';

const FONT = require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf');

export type BarPoint = { label: string; value: number };

/** Столбцы «плюс/минус»: доходность по месяцам, P&L по дням. Зелёные вверх, красные вниз. */
export function BarChart({
  data,
  height = 180,
  formatY,
}: {
  data: BarPoint[];
  height?: number;
  formatY?: (y: number) => string;
}) {
  const theme = useChartTheme();
  const font = useFont(FONT, 10);
  const rows = React.useMemo(
    () =>
      data.map((d, i) => ({
        i,
        label: d.label,
        up: d.value >= 0 ? d.value : 0,
        down: d.value < 0 ? d.value : 0,
      })),
    [data]
  );
  if (!rows.length) return <View style={{ height }} />;

  return (
    <View style={{ height }}>
      <CartesianChart
        data={rows}
        xKey="i"
        yKeys={['up', 'down']}
        domainPadding={{ left: 18, right: 18, top: 10, bottom: 10 }}
        xAxis={{
          font,
          labelColor: theme.text,
          lineColor: 'transparent',
          tickCount: Math.min(rows.length, 6),
          formatXLabel: (i) => rows[Math.round(Number(i))]?.label ?? '',
        }}
        yAxis={[
          {
            font,
            tickCount: 4,
            labelColor: theme.text,
            lineColor: theme.grid,
            formatYLabel: (y) => (formatY ? formatY(Number(y)) : String(y)),
          },
        ]}
        frame={{ lineColor: 'transparent' }}>
        {({ points, chartBounds }) => (
          <>
            <Bar
              points={points.up}
              chartBounds={chartBounds}
              color={theme.up}
              roundedCorners={{ topLeft: 3, topRight: 3 }}
              barCount={rows.length}
            />
            <Bar
              points={points.down}
              chartBounds={chartBounds}
              color={theme.down}
              roundedCorners={{ bottomLeft: 3, bottomRight: 3 }}
              barCount={rows.length}
            />
          </>
        )}
      </CartesianChart>
    </View>
  );
}
