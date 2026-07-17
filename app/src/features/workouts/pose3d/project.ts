/**
 * Projection 3D → 2D d'une pose pour un rendu SVG (stick figure), pure et testable.
 * Le viewer 3D natif (expo-gl/three) reste différé ; cette projection orthographique
 * suffit à animer la technique dans Expo Go et à la tester en Node.
 *
 * Pipeline : lerp keyframes → FK (positions monde) → rotation caméra (yaw autour de Y)
 * → projection orthographique (x', y) → mise à l'échelle stable dans le cadre.
 */

import type { ExercisePose } from './poses';
import { forwardKinematics, lerpPose, type JointName, type Vec3 } from './skeleton';

const RAD = Math.PI / 180;

export interface Point2D {
  x: number;
  y: number;
}
export interface ProjectedSegment {
  bone: string;
  from: Point2D;
  to: Point2D;
}
export interface ProjectedPose {
  joints: Partial<Record<JointName, Point2D>>;
  segments: ProjectedSegment[];
}

/** Rotation du point autour de Y (yaw caméra) puis projection orthographique (x', y). */
function project(v: Vec3, yawDeg: number): Point2D {
  const c = Math.cos(yawDeg * RAD);
  const s = Math.sin(yawDeg * RAD);
  return { x: v[0] * c + v[2] * s, y: v[1] };
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Transforme un point monde (Vec3) en coordonnées écran SVG (y vers le bas),
 * à l'échelle uniforme calée sur les extrêmes de l'animation (pas de saut/rescale).
 */
export interface Fit {
  apply: (v: Vec3) => Point2D;
}

/** Union des boîtes englobantes projetées sur un échantillon de phases (fit stable). */
function animationBounds(pose: ExercisePose, yawDeg: number): Bounds {
  const b: Bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
    const { segments } = forwardKinematics(lerpPose(pose.start, pose.end, phase));
    for (const s of segments) {
      for (const v of [s.from, s.to]) {
        const p = project(v, yawDeg);
        b.minX = Math.min(b.minX, p.x);
        b.maxX = Math.max(b.maxX, p.x);
        b.minY = Math.min(b.minY, p.y);
        b.maxY = Math.max(b.maxY, p.y);
      }
    }
  }
  return b;
}

/**
 * Calcule une transformation stable qui centre l'animation entière dans `width×height`
 * (avec marge `padding`), échelle uniforme, y inversé pour SVG.
 */
export function computeFit(
  pose: ExercisePose,
  yawDeg: number,
  width: number,
  height: number,
  padding = 16,
): Fit {
  const b = animationBounds(pose, yawDeg);
  const spanX = Math.max(b.maxX - b.minX, 1e-6);
  const spanY = Math.max(b.maxY - b.minY, 1e-6);
  const availW = Math.max(width - 2 * padding, 1);
  const availH = Math.max(height - 2 * padding, 1);
  const scale = Math.min(availW / spanX, availH / spanY);
  const offsetX = padding + (availW - scale * spanX) / 2;
  const offsetY = padding + (availH - scale * spanY) / 2;
  return {
    apply: (v: Vec3): Point2D => {
      const p = project(v, yawDeg);
      return {
        x: offsetX + (p.x - b.minX) * scale,
        // y monde vers le haut → y écran vers le bas.
        y: height - (offsetY + (p.y - b.minY) * scale),
      };
    },
  };
}

/** Pose projetée à la phase `phase ∈ [0,1]`, prête à dessiner. */
export function frameAt(pose: ExercisePose, phase: number, yawDeg: number, fit: Fit): ProjectedPose {
  const { joints, segments } = forwardKinematics(lerpPose(pose.start, pose.end, phase));
  return {
    joints: Object.fromEntries(
      Object.entries(joints).map(([k, v]) => [k, fit.apply(v as Vec3)]),
    ) as Partial<Record<JointName, Point2D>>,
    segments: segments.map((s) => ({ bone: s.bone, from: fit.apply(s.from), to: fit.apply(s.to) })),
  };
}
