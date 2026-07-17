import { describe, it, expect } from '@jest/globals';

import {
  IDENTITY,
  SKELETON,
  addVec,
  forwardKinematics,
  lerpPose,
  mulMat,
  mulVec,
  pingPong,
  rotationXYZ,
  scaleVec,
  type Mat3,
  type Pose,
  type Vec3,
} from './skeleton';

const finite = (v: Vec3) => v.every((n) => Number.isFinite(n));
const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

describe('skeleton — algèbre pure', () => {
  it('rotationXYZ(0,0,0) = identité', () => {
    expect(rotationXYZ(0, 0, 0)).toEqual(IDENTITY);
  });

  it('mulMat avec identité est neutre', () => {
    const m: Mat3 = rotationXYZ(30, -20, 45);
    mulMat(IDENTITY, m).forEach((v, i) => expect(approx(v, m[i]!)).toBe(true));
    mulMat(m, IDENTITY).forEach((v, i) => expect(approx(v, m[i]!)).toBe(true));
  });

  it('mulVec avec identité renvoie le vecteur', () => {
    expect(mulVec(IDENTITY, [1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('rotation de 90° autour de Z envoie +X vers +Y', () => {
    const r = mulVec(rotationXYZ(0, 0, 90), [1, 0, 0]);
    expect(approx(r[0], 0)).toBe(true);
    expect(approx(r[1], 1)).toBe(true);
    expect(approx(r[2], 0)).toBe(true);
  });

  it('rotationXYZ produit une matrice orthonormée (préserve la norme)', () => {
    const r = rotationXYZ(37, -52, 118);
    const v: Vec3 = [0.3, -0.7, 0.5];
    const rv = mulVec(r, v);
    const norm = (x: Vec3) => Math.hypot(...x);
    expect(approx(norm(rv), norm(v), 1e-9)).toBe(true);
  });

  it('addVec et scaleVec', () => {
    expect(addVec([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
    expect(scaleVec([1, -2, 3], 2)).toEqual([2, -4, 6]);
  });
});

describe('skeleton — cinématique directe', () => {
  const standing: Pose = { bones: {} };

  it('la pose debout pose les pieds au sol (y ≈ 0)', () => {
    const { segments } = forwardKinematics(standing);
    const minY = Math.min(...segments.flatMap((s) => [s.from[1], s.to[1]]));
    expect(approx(minY, 0, 1e-9)).toBe(true);
  });

  it('toutes les articulations sont finies et le bassin est au-dessus du sol', () => {
    const { joints, segments } = forwardKinematics(standing);
    for (const s of segments) {
      expect(finite(s.from)).toBe(true);
      expect(finite(s.to)).toBe(true);
    }
    expect(joints.pelvis[1]).toBeGreaterThan(0.5);
    expect(joints.headTop[1]).toBeGreaterThan(joints.pelvis[1]);
  });

  it('debout : symétrie gauche/droite (chevilles à hauteur égale, X opposés)', () => {
    const { joints } = forwardKinematics(standing);
    expect(approx(joints.ankleL[1], joints.ankleR[1])).toBe(true);
    expect(approx(joints.ankleL[0], -joints.ankleR[0])).toBe(true);
  });

  it('une pose fléchie garde le point le plus bas au sol (recalage)', () => {
    const squat: Pose = {
      bones: { thighL: [-100, 0, 0], thighR: [-100, 0, 0], shinL: [110, 0, 0], shinR: [110, 0, 0] },
    };
    const { segments } = forwardKinematics(squat);
    const minY = Math.min(...segments.flatMap((s) => [s.from[1], s.to[1]]));
    expect(approx(minY, 0, 1e-9)).toBe(true);
  });

  it('chaque bone du squelette produit un segment fini', () => {
    const { segments } = forwardKinematics(standing);
    expect(segments).toHaveLength(SKELETON.length);
    expect(new Set(segments.map((s) => s.bone)).size).toBe(SKELETON.length);
  });
});

describe('skeleton — interpolation', () => {
  it('lerpPose au milieu moyenne les angles des bones', () => {
    const a: Pose = { bones: { spine: [0, 0, 0] } };
    const b: Pose = { bones: { spine: [40, 0, 0] } };
    const mid = lerpPose(a, b, 0.5);
    expect(mid.bones.spine![0]).toBe(20);
  });

  it('lerpPose t=0 et t=1 reproduisent les extrémités', () => {
    const a: Pose = { rootY: 1, bones: { spine: [10, 0, 0] } };
    const b: Pose = { rootY: 2, bones: { spine: [30, 0, 0] } };
    expect(lerpPose(a, b, 0).bones.spine![0]).toBe(10);
    expect(lerpPose(a, b, 1).bones.spine![0]).toBe(30);
    expect(lerpPose(a, b, 0).rootY).toBe(1);
    expect(lerpPose(a, b, 1).rootY).toBe(2);
  });

  it('lerpPose traite un bone absent comme repos (0)', () => {
    const a: Pose = { bones: {} };
    const b: Pose = { bones: { spine: [40, 0, 0] } };
    expect(lerpPose(a, b, 0.5).bones.spine![0]).toBe(20);
  });

  it('pingPong : 0→0, 0.5→1, 1→0, monotone sur la première moitié', () => {
    expect(approx(pingPong(0), 0)).toBe(true);
    expect(approx(pingPong(0.5), 1)).toBe(true);
    expect(approx(pingPong(1), 0)).toBe(true);
    expect(pingPong(0.25)).toBeGreaterThan(pingPong(0.1));
    for (let t = 0; t <= 2; t += 0.05) {
      const p = pingPong(t);
      expect(p).toBeGreaterThanOrEqual(-1e-9);
      expect(p).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});
