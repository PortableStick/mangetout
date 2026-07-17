import { describe, it, expect } from '@jest/globals';

import { POSES } from './poses';
import { computeFit, frameAt } from './project';

const W = 300;
const H = 260;
const PAD = 16;

describe('project — projection 3D→2D pour SVG', () => {
  it('cale toutes les articulations dans le cadre (marge comprise) sur toute l’animation', () => {
    for (const pose of Object.values(POSES)) {
      const fit = computeFit(pose, pose.cameraYaw, W, H, PAD);
      for (const phase of [0, 0.5, 1]) {
        const frame = frameAt(pose, phase, pose.cameraYaw, fit);
        const pts = frame.segments.flatMap((s) => [s.from, s.to]);
        for (const p of pts) {
          expect(p.x).toBeGreaterThanOrEqual(-1e-6);
          expect(p.x).toBeLessThanOrEqual(W + 1e-6);
          expect(p.y).toBeGreaterThanOrEqual(-1e-6);
          expect(p.y).toBeLessThanOrEqual(H + 1e-6);
          expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
        }
      }
    }
  });

  it('inverse Y : la tête est plus haute à l’écran (y plus petit) que les pieds', () => {
    const fit = computeFit(POSES.squat!, POSES.squat!.cameraYaw, W, H, PAD);
    const frame = frameAt(POSES.squat!, 0, POSES.squat!.cameraYaw, fit);
    expect(frame.joints.headTop!.y).toBeLessThan(frame.joints.ankleL!.y);
  });

  it('est déterministe pour des entrées identiques', () => {
    const a = frameAt(POSES.squat!, 0.5, 40, computeFit(POSES.squat!, 40, W, H, PAD));
    const b = frameAt(POSES.squat!, 0.5, 40, computeFit(POSES.squat!, 40, W, H, PAD));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('le yaw caméra change la projection (vue de profil ≠ vue de face)', () => {
    const front = frameAt(POSES.squat!, 1, 0, computeFit(POSES.squat!, 0, W, H, PAD));
    const side = frameAt(POSES.squat!, 1, 90, computeFit(POSES.squat!, 90, W, H, PAD));
    expect(JSON.stringify(front)).not.toBe(JSON.stringify(side));
  });

  it('remplit une des deux dimensions jusqu’à la marge (échelle maximale)', () => {
    const fit = computeFit(POSES.squat!, POSES.squat!.cameraYaw, W, H, PAD);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
      for (const s of frameAt(POSES.squat!, phase, POSES.squat!.cameraYaw, fit).segments) {
        for (const p of [s.from, s.to]) {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        }
      }
    }
    const fillsWidth = minX <= PAD + 1 && maxX >= W - PAD - 1;
    const fillsHeight = minY <= PAD + 1 && maxY >= H - PAD - 1;
    expect(fillsWidth || fillsHeight).toBe(true);
  });
});
