/**
 * Squelette humanoïde 3D + cinématique directe (FK) pure.
 * Aucune dépendance : vecteurs/matrices maison, testable en Node.
 *
 * Convention : Y vers le haut, Z vers le spectateur, X vers la droite du
 * personnage (repère main droite). Angles en degrés, rotations XYZ
 * intrinsèques appliquées dans le repère du parent.
 */

export type Vec3 = [number, number, number];
/** Matrice 3×3 en ligne-major. */
export type Mat3 = [number, number, number, number, number, number, number, number, number];

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function mulMat(a: Mat3, b: Mat3): Mat3 {
  const [a0, a1, a2, a3, a4, a5, a6, a7, a8] = a;
  const [b0, b1, b2, b3, b4, b5, b6, b7, b8] = b;
  return [
    a0 * b0 + a1 * b3 + a2 * b6, a0 * b1 + a1 * b4 + a2 * b7, a0 * b2 + a1 * b5 + a2 * b8,
    a3 * b0 + a4 * b3 + a5 * b6, a3 * b1 + a4 * b4 + a5 * b7, a3 * b2 + a4 * b5 + a5 * b8,
    a6 * b0 + a7 * b3 + a8 * b6, a6 * b1 + a7 * b4 + a8 * b7, a6 * b2 + a7 * b5 + a8 * b8,
  ];
}

export function mulVec(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

export function addVec(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scaleVec(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

const RAD = Math.PI / 180;

/** Rotation intrinsèque XYZ (degrés) → matrice. */
export function rotationXYZ(rx: number, ry: number, rz: number): Mat3 {
  const [cx, sx] = [Math.cos(rx * RAD), Math.sin(rx * RAD)];
  const [cy, sy] = [Math.cos(ry * RAD), Math.sin(ry * RAD)];
  const [cz, sz] = [Math.cos(rz * RAD), Math.sin(rz * RAD)];
  const mx: Mat3 = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
  const my: Mat3 = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const mz: Mat3 = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  return mulMat(mulMat(mx, my), mz);
}

export type BoneName =
  | 'spine'
  | 'neck'
  | 'head'
  | 'upperArmL'
  | 'forearmL'
  | 'upperArmR'
  | 'forearmR'
  | 'thighL'
  | 'shinL'
  | 'footL'
  | 'thighR'
  | 'shinR'
  | 'footR';

export type JointName = 'pelvis' | 'chest' | 'neckTop' | 'headTop' | 'shoulderL' | 'elbowL' | 'wristL' | 'shoulderR' | 'elbowR' | 'wristR' | 'hipL' | 'kneeL' | 'ankleL' | 'toeL' | 'hipR' | 'kneeR' | 'ankleR' | 'toeR';

interface BoneDef {
  name: BoneName;
  /** Articulation de départ (doit exister avant ce bone dans SKELETON). */
  from: JointName;
  /** Articulation créée au bout du bone. */
  to: JointName;
  parent?: BoneName;
  /** Direction au repos dans le repère du parent (unité). */
  rest: Vec3;
  /** Longueur (m, humanoïde ~1,75 m). */
  length: number;
  /** Décalage du point d'attache dans le repère du parent (épaules/hanches). */
  offset?: Vec3;
}

/** Ordre topologique : chaque bone vient après son parent. */
export const SKELETON: BoneDef[] = [
  { name: 'spine', from: 'pelvis', to: 'chest', rest: [0, 1, 0], length: 0.45 },
  { name: 'neck', from: 'chest', to: 'neckTop', parent: 'spine', rest: [0, 1, 0], length: 0.08 },
  { name: 'head', from: 'neckTop', to: 'headTop', parent: 'neck', rest: [0, 1, 0], length: 0.2 },
  { name: 'upperArmL', from: 'shoulderL', to: 'elbowL', parent: 'spine', rest: [0, -1, 0], length: 0.3, offset: [-0.2, 0.42, 0] },
  { name: 'forearmL', from: 'elbowL', to: 'wristL', parent: 'upperArmL', rest: [0, -1, 0], length: 0.27 },
  { name: 'upperArmR', from: 'shoulderR', to: 'elbowR', parent: 'spine', rest: [0, -1, 0], length: 0.3, offset: [0.2, 0.42, 0] },
  { name: 'forearmR', from: 'elbowR', to: 'wristR', parent: 'upperArmR', rest: [0, -1, 0], length: 0.27 },
  { name: 'thighL', from: 'hipL', to: 'kneeL', rest: [0, -1, 0], length: 0.42, offset: [-0.1, 0, 0] },
  { name: 'shinL', from: 'kneeL', to: 'ankleL', parent: 'thighL', rest: [0, -1, 0], length: 0.42 },
  { name: 'footL', from: 'ankleL', to: 'toeL', parent: 'shinL', rest: [0, 0, 1], length: 0.2 },
  { name: 'thighR', from: 'hipR', to: 'kneeR', rest: [0, -1, 0], length: 0.42, offset: [0.1, 0, 0] },
  { name: 'shinR', from: 'kneeR', to: 'ankleR', parent: 'thighR', rest: [0, -1, 0], length: 0.42 },
  { name: 'footR', from: 'ankleR', to: 'toeR', parent: 'shinR', rest: [0, 0, 1], length: 0.2 },
];

/** Rotation [rx, ry, rz] en degrés par bone (absentes = repos). */
export type Pose = {
  /** Rotation globale du bassin (penché en avant, allongé…). */
  root?: [number, number, number];
  /** Hauteur du bassin (m) — recalée ensuite pour poser les pieds au sol. */
  rootY?: number;
  bones: Partial<Record<BoneName, [number, number, number]>>;
};

export interface FkSegment {
  bone: BoneName;
  from: Vec3;
  to: Vec3;
}

export interface FkResult {
  joints: Record<JointName, Vec3>;
  segments: FkSegment[];
}

/**
 * Cinématique directe : positions monde de toutes les articulations.
 * Le résultat est recalé verticalement pour que le point le plus bas
 * (pieds en général) touche le sol (y = 0).
 */
export function forwardKinematics(pose: Pose): FkResult {
  const rootRot = pose.root ? rotationXYZ(...pose.root) : IDENTITY;
  const rootPos: Vec3 = [0, pose.rootY ?? 0.94, 0];

  const rotations = new Map<BoneName, Mat3>();
  const boneStarts = new Map<BoneName, Vec3>();
  const boneEnds = new Map<BoneName, Vec3>();
  const joints: Partial<Record<JointName, Vec3>> = { pelvis: rootPos };
  const segments: FkSegment[] = [];

  for (const bone of SKELETON) {
    const parentRot = bone.parent ? rotations.get(bone.parent)! : rootRot;
    const local = pose.bones[bone.name];
    const rot = local ? mulMat(parentRot, rotationXYZ(...local)) : parentRot;
    rotations.set(bone.name, rot);

    // Attache : décalage depuis le DÉBUT du parent (épaules/hanches),
    // sinon bout du parent (coude après épaule, tibia après cuisse…).
    const parentBase = bone.parent ? boneStarts.get(bone.parent)! : rootPos;
    const attach = bone.offset
      ? addVec(parentBase, mulVec(parentRot, bone.offset))
      : bone.parent
        ? boneEnds.get(bone.parent)!
        : rootPos;
    const end = addVec(attach, mulVec(rot, scaleVec(bone.rest, bone.length)));

    boneStarts.set(bone.name, attach);
    boneEnds.set(bone.name, end);
    joints[bone.from] = joints[bone.from] ?? attach;
    joints[bone.to] = end;
    segments.push({ bone: bone.name, from: attach, to: end });
  }

  // Recalage au sol : le point le plus bas touche y = 0.
  let minY = Infinity;
  for (const s of segments) minY = Math.min(minY, s.from[1], s.to[1]);
  const dy = -minY;
  const lift = (v: Vec3): Vec3 => [v[0], v[1] + dy, v[2]];
  const liftedJoints = Object.fromEntries(
    Object.entries(joints).map(([k, v]) => [k, lift(v as Vec3)]),
  ) as Record<JointName, Vec3>;
  return {
    joints: liftedJoints,
    segments: segments.map((s) => ({ ...s, from: lift(s.from), to: lift(s.to) })),
  };
}

/** Interpolation linéaire entre deux poses (t ∈ [0,1]), bones absents = repos. */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const l = (x: number, y: number) => x + (y - x) * t;
  const lerp3 = (x: [number, number, number] = [0, 0, 0], y: [number, number, number] = [0, 0, 0]): [number, number, number] => [l(x[0], y[0]), l(x[1], y[1]), l(x[2], y[2])];
  const names = new Set<BoneName>([...Object.keys(a.bones), ...Object.keys(b.bones)] as BoneName[]);
  const bones: Pose['bones'] = {};
  for (const n of names) bones[n] = lerp3(a.bones[n], b.bones[n]);
  return {
    root: a.root || b.root ? lerp3(a.root, b.root) : undefined,
    rootY: a.rootY !== undefined || b.rootY !== undefined ? l(a.rootY ?? 0.94, b.rootY ?? 0.94) : undefined,
    bones,
  };
}

/** Aller-retour fluide : t ∈ [0,1] → phase ∈ [0,1] avec easing cosinus. */
export function pingPong(t: number): number {
  const cycle = t % 1;
  const phase = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2;
  return (1 - Math.cos(phase * Math.PI)) / 2;
}
