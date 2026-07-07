import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

import { chartGeometry, toPolyline } from './weight';

/** Courbe de tendance du poids (SVG). Largeur mesurée via onLayout. */
export function WeightChart({ values, height = 170 }: { values: number[]; height?: number }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const { points } = chartGeometry(values, width, height);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && points.length > 0 ? (
        <Svg width={width} height={height}>
          {points.length > 1 ? (
            <Polyline
              points={toPolyline(points)}
              fill="none"
              stroke={theme.colors.accent}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={3} fill={theme.colors.accent} />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
