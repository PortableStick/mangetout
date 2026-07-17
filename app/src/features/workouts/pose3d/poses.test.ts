import { describe, it, expect } from '@jest/globals';

import { POSES, poseFor, type ExercisePose } from './poses';
import { SKELETON, forwardKinematics, type BoneName, type Pose } from './skeleton';

const VALID_BONES = new Set<string>(SKELETON.map((b) => b.name));

function allBoneKeys(pose: Pose): string[] {
  return Object.keys(pose.bones);
}

describe('poses — cohérence des keyframes', () => {
  it('n’utilise que des bones valides du squelette', () => {
    for (const [id, pose] of Object.entries(POSES)) {
      for (const key of [...allBoneKeys(pose.start), ...allBoneKeys(pose.end)]) {
        expect(VALID_BONES.has(key)).toBe(true);
        if (!VALID_BONES.has(key)) throw new Error(`${id}: bone inconnu ${key}`);
      }
    }
  });

  it('chaque keyframe passe la FK sans NaN et pose le point bas au sol', () => {
    for (const [id, pose] of Object.entries(POSES)) {
      for (const kf of [pose.start, pose.end] as Pose[]) {
        const { segments } = forwardKinematics(kf);
        const ys = segments.flatMap((s) => [s.from[1], s.to[1]]);
        const coords = segments.flatMap((s) => [...s.from, ...s.to]);
        expect(coords.every((n) => Number.isFinite(n))).toBe(true);
        expect(Math.abs(Math.min(...ys))).toBeLessThan(1e-9);
        if (!coords.every((n) => Number.isFinite(n))) throw new Error(`${id}: coord NaN`);
      }
    }
  });

  it('durées et yaw caméra sont dans des bornes plausibles', () => {
    for (const [id, pose] of Object.entries(POSES) as [string, ExercisePose][]) {
      expect(pose.durationMs).toBeGreaterThanOrEqual(800);
      expect(pose.durationMs).toBeLessThanOrEqual(4000);
      expect(pose.cameraYaw).toBeGreaterThanOrEqual(-180);
      expect(pose.cameraYaw).toBeLessThanOrEqual(180);
      expect(pose.label.length).toBeGreaterThan(0);
      if (pose.durationMs <= 0) throw new Error(`${id}: durée invalide`);
    }
  });

  it('start et end diffèrent (sauf isométriques volontairement statiques)', () => {
    const staticPoses = new Set(['plank']);
    for (const [id, pose] of Object.entries(POSES)) {
      if (staticPoses.has(id)) continue;
      expect(JSON.stringify(pose.start)).not.toBe(JSON.stringify(pose.end));
    }
  });

  it('poseFor résout un id connu et renvoie undefined sinon', () => {
    expect(poseFor('squat')).toBe(POSES.squat);
    expect(poseFor(undefined)).toBeUndefined();
    expect(poseFor('inexistant')).toBeUndefined();
  });
});

// Garde-fou de typage : tout bone déclaré dans une pose doit être un BoneName.
const _typecheckBones: BoneName[] = SKELETON.map((b) => b.name);
void _typecheckBones;
