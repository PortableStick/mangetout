import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

import { poseFor } from './pose3d/poses';
import { computeFit, frameAt } from './pose3d/project';
import { pingPong } from './pose3d/skeleton';

/**
 * Visualiseur de pose animé (stick figure SVG 2D). Rend la technique d'un
 * exercice sans dépendance native 3D — utilisable en Expo Go et sur device.
 * Le poseId provient de `exerciseLibrary` (voir `pose3d/poses.ts`).
 */
export function PoseViewer({ poseId, height = 260 }: { poseId?: string; height?: number }) {
  const theme = useTheme();
  const pose = poseFor(poseId);
  const [width, setWidth] = useState(0);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const startRef = useRef<number | null>(null);

  const fit = useMemo(
    () => (pose && width > 0 ? computeFit(pose, pose.cameraYaw, width, height) : null),
    [pose, width, height],
  );

  useEffect(() => {
    if (!pose || !playing) return;
    const period = pose.durationMs * 2; // aller + retour
    let raf: number;
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = (now - startRef.current) % period;
      setPhase(pingPong(elapsed / period));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      startRef.current = null;
    };
  }, [pose, playing]);

  if (!pose) return null;

  const frame = fit ? frameAt(pose, phase, pose.cameraYaw, fit) : null;
  const head = frame?.joints.headTop;
  const neck = frame?.joints.neckTop;
  const headR = head && neck ? Math.hypot(head.x - neck.x, head.y - neck.y) / 2 : 0;

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Pressable
        onPress={() => setPlaying((p) => !p)}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Mettre l’animation en pause' : 'Lancer l’animation'}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          height,
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: theme.radius.lg,
          overflow: 'hidden',
        }}
      >
        {frame && width > 0 ? (
          <Svg width={width} height={height}>
            {frame.segments.map((s) => (
              <Line
                key={s.bone}
                x1={s.from.x}
                y1={s.from.y}
                x2={s.to.x}
                y2={s.to.y}
                stroke={theme.colors.accent}
                strokeWidth={7}
                strokeLinecap="round"
              />
            ))}
            {Object.entries(frame.joints).map(([name, p]) => (
              <Circle key={name} cx={p.x} cy={p.y} r={4} fill={theme.colors.accent} />
            ))}
            {head && headR > 0 ? (
              <Circle
                cx={head.x}
                cy={head.y}
                r={headR}
                fill={theme.colors.surfaceMuted}
                stroke={theme.colors.accent}
                strokeWidth={7}
              />
            ) : null}
          </Svg>
        ) : null}
      </Pressable>
      <Text variant="footnote" color="textTertiary" center>
        {pose.label} · {playing ? 'appuyer pour mettre en pause' : 'en pause'}
      </Text>
    </View>
  );
}
