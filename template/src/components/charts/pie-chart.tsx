import * as React from 'react';
import { View } from 'react-native';
import { Pie, PolarChart } from 'victory-native';

import { useChartTheme } from '@/lib/chart-theme';

export type PieSlice = { label: string; value: number };

/** Кольцевая диаграмма: доли активов, расходы по категориям. */
export function PieChart({ data, size = 180 }: { data: PieSlice[]; size?: number }) {
  const theme = useChartTheme();
  const rows = React.useMemo(
    () =>
      data
        .filter((d) => d.value > 0)
        .map((d, i) => ({ ...d, color: theme.series[i % theme.series.length] })),
    [data, theme]
  );
  if (!rows.length) return <View style={{ height: size, width: size }} />;
  return (
    <View style={{ height: size, width: size }}>
      <PolarChart data={rows} labelKey="label" valueKey="value" colorKey="color">
        <Pie.Chart innerRadius="62%">
          {() => (
            <>
              <Pie.Slice />
              <Pie.SliceAngularInset
                angularInset={{ angularStrokeWidth: 2, angularStrokeColor: theme.background }}
              />
            </>
          )}
        </Pie.Chart>
      </PolarChart>
    </View>
  );
}

/** Цвет доли по индексу — для легенды рядом с диаграммой. */
export function usePieColors() {
  return useChartTheme().series;
}
