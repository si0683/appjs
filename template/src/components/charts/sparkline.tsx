import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import * as React from 'react';

/** Мини-график в строке списка (как в приложениях бирж). Без осей, только линия. */
export function Sparkline({
  values,
  color,
  width = 72,
  height = 28,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const path = React.useMemo(() => {
    const p = Skia.PathBuilder.Make();
    if (values.length < 2) return p.build();
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    values.forEach((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - 2 - ((v - min) / span) * (height - 4);
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    });
    return p.build();
  }, [values, width, height]);

  return (
    <Canvas style={{ width, height }}>
      <Path path={path} color={color} style="stroke" strokeWidth={1.5} strokeJoin="round" />
    </Canvas>
  );
}
