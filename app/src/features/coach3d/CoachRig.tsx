import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, PixelRatio, StyleSheet, View } from 'react-native';
import * as THREE from 'three';

/**
 * Rig 3D procédural du coach — port RN (`three` + `expo-gl`) de `CoachRig.jsx` (handoff design
 * system, Three.js UMD web). Athlète low-poly articulé + machines (haltère, pec-deck, rameur),
 * assemblés depuis des primitives Three.js (aucun asset/modèle externe). La géométrie et les
 * chorégraphies (`EX.*`, `tempoPhase`, `solveLeg`) sont des maths pures portées telles quelles ;
 * seul le rendu change (DOM/UMD web → `GLView` expo-gl + boucle `requestAnimationFrame`).
 *
 * Cycle de vie GL (création renderer, boucle RAF, dispose, suspension focus/background) factorisé
 * dans le hook partagé `useGlScene` (voir plus bas) — consommé par `CoachCore` et `MovementDemoView`.
 */

const INK = 0x1a1c17;
const INK2 = 0x24261f;
const VOLT = 0xcdfb49;
const WARN = 0xffb03a;

/**
 * Shim `canvas` pour `THREE.WebGLRenderer` sous React Native : sans lui, three tente
 * `document.createElement('canvas')` (API web absente) → « Property 'document' doesn't exist ».
 * On fournit un objet minimal exposant le contexte GL d'expo-gl.
 */
function makeCanvas(
  gl: ExpoWebGLRenderingContext,
  width: number,
  height: number
): HTMLCanvasElement {
  return {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    getContext: () => gl,
  } as unknown as HTMLCanvasElement;
}

interface Mats {
  body: THREE.MeshLambertMaterial;
  steel: THREE.MeshLambertMaterial;
  edge: THREE.LineBasicMaterial;
  accent: THREE.MeshBasicMaterial;
}

function createMats(): Mats {
  return {
    body: new THREE.MeshLambertMaterial({ color: INK, flatShading: true }),
    steel: new THREE.MeshLambertMaterial({ color: INK2, flatShading: true }),
    edge: new THREE.LineBasicMaterial({ color: VOLT, transparent: true, opacity: 0.55 }),
    accent: new THREE.MeshBasicMaterial({ color: VOLT }),
  };
}

/** Pièce facettée = mesh + liseré volt (`EdgesGeometry` + `LineSegments`). */
function part(geometry: THREE.BufferGeometry, mats: Mats, steel = false): THREE.Group {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, steel ? mats.steel : mats.body));
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), mats.edge));
  return group;
}

interface Limb {
  root: THREE.Group;
  mid: THREE.Group;
  end: THREE.Group;
}

/** Membre : racine (épaule/hanche) → segment haut → articulation (coude/genou) → segment bas → extrémité. */
function makeLimb(mats: Mats, len1: number, len2: number, thick: number): Limb {
  const root = new THREE.Group();
  const upper = part(new THREE.BoxGeometry(thick, len1, thick), mats);
  upper.position.y = -len1 / 2;
  const joint = new THREE.Mesh(new THREE.IcosahedronGeometry(thick * 0.62, 0), mats.accent);
  const mid = new THREE.Group();
  mid.position.y = -len1;
  mid.add(new THREE.Mesh(new THREE.IcosahedronGeometry(thick * 0.6, 0), mats.accent));
  const lower = part(new THREE.BoxGeometry(thick * 0.86, len2, thick * 0.86), mats);
  lower.position.y = -len2 / 2;
  const end = new THREE.Group();
  end.position.y = -len2;
  mid.add(lower);
  mid.add(end);
  root.add(upper, mid, joint);
  return { root, mid, end };
}

interface CoachFigureData {
  lower: THREE.Group;
  upper: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  lSh: THREE.Group;
  rSh: THREE.Group;
  lArm: Limb;
  rArm: Limb;
  lHip: THREE.Group;
  rHip: THREE.Group;
  lLeg: Limb;
  rLeg: Limb;
  dbL?: THREE.Group;
  dbR?: THREE.Group;
}

interface CoachFigure {
  fig: THREE.Group;
  data: CoachFigureData;
}

/** Construit l'athlète low-poly articulé (pose athlétique debout par défaut). */
function buildCoach(mats: Mats): CoachFigure {
  const fig = new THREE.Group();

  const lower = new THREE.Group();
  fig.add(lower);
  const hips = part(new THREE.BoxGeometry(0.74, 0.32, 0.42), mats);
  lower.add(hips);
  const lHip = new THREE.Group();
  lHip.position.set(0.22, -0.14, 0);
  lower.add(lHip);
  const rHip = new THREE.Group();
  rHip.position.set(-0.22, -0.14, 0);
  lower.add(rHip);
  const lLeg = makeLimb(mats, 0.85, 0.8, 0.24);
  lHip.add(lLeg.root);
  const rLeg = makeLimb(mats, 0.85, 0.8, 0.24);
  rHip.add(rLeg.root);
  const buildShoe = (): THREE.Group => {
    const shoe = part(new THREE.BoxGeometry(0.26, 0.16, 0.44), mats);
    shoe.position.set(0, -0.02, 0.1);
    const toe = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.05, 0.12), mats.accent);
    toe.position.set(0, -0.05, 0.28);
    shoe.add(toe);
    return shoe;
  };
  lLeg.end.add(buildShoe());
  rLeg.end.add(buildShoe());

  const upper = new THREE.Group();
  upper.position.y = 0.05;
  fig.add(upper);
  const torso = part(new THREE.CylinderGeometry(0.4, 0.52, 1.15, 6), mats);
  torso.position.y = 0.68;
  upper.add(torso);
  const chestLine = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.06), mats.accent);
  chestLine.position.set(0, 0.95, 0.44);
  upper.add(chestLine);
  const yoke = part(new THREE.BoxGeometry(1.02, 0.2, 0.34), mats);
  yoke.position.y = 1.26;
  upper.add(yoke);
  const neck = part(new THREE.CylinderGeometry(0.11, 0.14, 0.2, 6), mats);
  neck.position.y = 1.42;
  upper.add(neck);
  const head = new THREE.Group();
  head.position.y = 1.78;
  upper.add(head);
  head.add(part(new THREE.IcosahedronGeometry(0.34, 0), mats));
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.06), mats.accent);
  visor.position.set(0, 0.02, 0.3);
  head.add(visor);

  const lSh = new THREE.Group();
  lSh.position.set(0.52, 1.24, 0);
  upper.add(lSh);
  const rSh = new THREE.Group();
  rSh.position.set(-0.52, 1.24, 0);
  upper.add(rSh);
  const lArm = makeLimb(mats, 0.58, 0.54, 0.19);
  lSh.add(lArm.root);
  const rArm = makeLimb(mats, 0.58, 0.54, 0.19);
  rSh.add(rArm.root);
  const glove = (): THREE.Mesh => new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), mats.accent);
  lArm.end.add(glove());
  rArm.end.add(glove());

  lSh.rotation.z = 0.22;
  rSh.rotation.z = -0.22;
  lArm.mid.rotation.x = 0.35;
  rArm.mid.rotation.x = 0.35;
  lHip.rotation.z = 0.05;
  rHip.rotation.z = -0.05;

  const data: CoachFigureData = {
    lower,
    upper,
    torso,
    head,
    lSh,
    rSh,
    lArm,
    rArm,
    lHip,
    rHip,
    lLeg,
    rLeg,
  };
  return { fig, data };
}

function buildDumbbell(mats: Mats): THREE.Group {
  const g = new THREE.Group();
  const handle = part(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 8), mats, true);
  handle.rotation.z = Math.PI / 2;
  g.add(handle);
  for (const x of [-0.26, 0.26]) {
    const weight = part(new THREE.CylinderGeometry(0.15, 0.15, 0.18, 6), mats);
    weight.rotation.z = Math.PI / 2;
    weight.position.x = x;
    g.add(weight);
  }
  return g;
}

interface ButterflyMachine {
  group: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
}

/** Pec-deck : siège, dossier, deux bras verticaux pivotant autour de Y (adduction horizontale). */
function buildButterfly(mats: Mats): ButterflyMachine {
  const g = new THREE.Group();
  const base = part(new THREE.BoxGeometry(1.5, 0.16, 1.6), mats, true);
  base.position.y = -1.5;
  g.add(base);
  const column = part(new THREE.BoxGeometry(0.26, 2.6, 0.26), mats, true);
  column.position.set(0, -0.3, -0.7);
  g.add(column);
  const seat = part(new THREE.BoxGeometry(0.7, 0.16, 0.66), mats, true);
  seat.position.set(0, -0.55, -0.15);
  g.add(seat);
  const backPad = part(new THREE.BoxGeometry(0.62, 1.3, 0.16), mats, true);
  backPad.position.set(0, 0.25, -0.5);
  g.add(backPad);

  const armPad = (side: 1 | -1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.35, 0.95, -0.15);
    pivot.rotation.y = side * 1.35; // départ ouvert (pads écartés)
    const arm = part(new THREE.BoxGeometry(0.1, 0.1, 0.8), mats, true);
    arm.position.set(0, 0, 0.4);
    pivot.add(arm);
    const pad = part(new THREE.BoxGeometry(0.14, 0.7, 0.24), mats);
    pad.position.set(0, -0.05, 0.8);
    pivot.add(pad);
    g.add(pivot);
    return pivot;
  };
  const armL = armPad(1);
  const armR = armPad(-1);
  return { group: g, armL, armR };
}

interface RowerMachine {
  group: THREE.Group;
  seat: THREE.Group;
  handle: THREE.Group;
  chain: THREE.Mesh;
}

function buildRower(mats: Mats): RowerMachine {
  const g = new THREE.Group();
  const rail = part(new THREE.BoxGeometry(0.22, 0.1, 2.6), mats, true);
  rail.position.set(0, -1.15, 0);
  g.add(rail);
  const fly = part(new THREE.CylinderGeometry(0.55, 0.55, 0.28, 10), mats, true);
  fly.rotation.z = Math.PI / 2;
  fly.position.set(0, -0.75, 1.4);
  g.add(fly);
  const flyGuard = part(new THREE.BoxGeometry(0.7, 0.5, 0.5), mats, true);
  flyGuard.position.set(0, -1.0, 1.2);
  g.add(flyGuard);
  for (const x of [0.22, -0.22]) {
    const foot = part(new THREE.BoxGeometry(0.2, 0.34, 0.12), mats);
    foot.position.set(x, -1.0, 1.05);
    foot.rotation.x = 0.3;
    g.add(foot);
  }
  const seat = new THREE.Group();
  seat.position.set(0, -0.95, -0.2);
  g.add(seat);
  seat.add(part(new THREE.BoxGeometry(0.5, 0.14, 0.5), mats, true));
  const handle = new THREE.Group();
  handle.position.set(0, -0.55, 0.6);
  g.add(handle);
  const bar = part(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), mats);
  bar.rotation.z = Math.PI / 2;
  handle.add(bar);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), mats.accent);
  chain.rotation.x = Math.PI / 2;
  handle.add(chain);
  return { group: g, seat, handle, chain };
}

type Machine = ButterflyMachine | RowerMachine;

// ---- helpers de tempo/IK (maths pures, portées telles quelles) ----

const smooth = (x: number): number => {
  const clamped = Math.max(0, Math.min(1, x));
  return clamped * clamped * (3 - 2 * clamped);
};
const seg = (p: number, a: number, b: number): number => smooth((p - a) / (b - a));
const clampAcos = (v: number): number => Math.acos(Math.max(-1, Math.min(1, v)));
const LEG1 = 0.85;
const LEG2 = 0.8;

interface LegSolution {
  hip: number;
  knee: number;
}

/**
 * IK jambe à 2 segments : étant donné la cible cheville relative à la hanche (dy vers le bas < 0,
 * dz vers l'avant > 0), renvoie la flexion de hanche (négatif = vers l'avant) et de genou.
 */
function solveLeg(dy: number, dz: number): LegSolution {
  let d = Math.hypot(dy, dz);
  d = Math.min(d, (LEG1 + LEG2) * 0.99);
  const phi = Math.atan2(dz, -dy);
  const a = clampAcos((d * d + LEG1 * LEG1 - LEG2 * LEG2) / (2 * d * LEG1));
  const b = clampAcos((LEG1 * LEG1 + LEG2 * LEG2 - d * d) / (2 * LEG1 * LEG2));
  return { hip: -(phi + a), knee: Math.PI - b };
}

/** Tempo d'exécution (secondes) : concentrique, excentrique, pauses haut/bas. */
export interface Tempo {
  con?: number;
  ecc?: number;
  holdT?: number;
  holdB?: number;
}

/** Phase 0..1 pilotée par le tempo : monte sur `con`s, tient, descend sur `ecc`s, tient. */
function tempoPhase(t: number, tempo: Tempo): number {
  const con = tempo.con || 1.5;
  const ecc = tempo.ecc || 1.5;
  const holdTop = tempo.holdT || 0;
  const holdBottom = tempo.holdB || 0;
  const total = con + holdTop + ecc + holdBottom;
  let x = ((t % total) + total) % total;
  if (x < con) return smooth(x / con);
  x -= con;
  if (x < holdTop) return 1;
  x -= holdTop;
  if (x < ecc) return 1 - smooth(x / ecc);
  return 0;
}

export type ExerciseId = 'dumbbells' | 'butterfly' | 'rower';

interface ExerciseDef {
  title: string;
  cue: string;
  seated?: boolean;
  /** Le rig lui-même se déplace en Z (cas rameur) — la choréo pilote alors `fig.position.z`. */
  figZ?: boolean;
  machine?: 'butterfly' | 'rower';
  tempo: Tempo;
  setup: (mats: Mats, u: CoachFigureData) => void;
  update: (p: number, u: CoachFigureData, mach: Machine | undefined, fig: THREE.Group | null) => void;
}

/** Chorégraphies des 3 mouvements portées de `CoachRig.jsx` (objet `EX`). */
const EX: Record<ExerciseId, ExerciseDef> = {
  dumbbells: {
    title: 'Haltères',
    cue: 'Coude fixe, pas d’élan. Le tempo mène le mouvement.',
    tempo: { con: 1, ecc: 3 },
    setup(mats, u) {
      u.dbL = buildDumbbell(mats);
      u.dbR = buildDumbbell(mats);
      u.lArm.end.add(u.dbL);
      u.rArm.end.add(u.dbR);
      u.lSh.rotation.z = 0.1;
      u.rSh.rotation.z = -0.1;
    },
    update(p, u) {
      // flexion pure du coude, l'avant-bras remonte devant ; le bras haut reste plaqué aux côtes
      u.lArm.mid.rotation.x = -(0.08 + p * 2.35);
      u.rArm.mid.rotation.x = -(0.08 + p * 2.35);
      u.lSh.rotation.x = -p * 0.06;
      u.rSh.rotation.x = -p * 0.06;
      u.torso.scale.setScalar(1 + p * 0.012);
    },
  },
  butterfly: {
    title: 'Butterfly (pec-deck)',
    cue: 'Ouvre grand, resserre devant la poitrine. Coudes à hauteur d’épaule.',
    seated: true,
    machine: 'butterfly',
    tempo: { con: 1.5, ecc: 2, holdT: 0.3 },
    setup(_mats, u) {
      // assis : cuisses inclinées vers l'avant-bas pour poser les pieds sur la base
      u.lHip.rotation.x = -1.27;
      u.rHip.rotation.x = -1.27;
      u.lLeg.mid.rotation.x = 1.27;
      u.rLeg.mid.rotation.x = 1.27;
      u.lLeg.end.rotation.x = 0;
      u.rLeg.end.rotation.x = 0;
      u.upper.rotation.x = 0;
      // bras abduits à hauteur d'épaule, coudes fléchis ~90° vers l'avant ; balayage autour de Y
      u.lSh.rotation.order = 'YZX';
      u.rSh.rotation.order = 'YZX';
      u.lSh.rotation.set(0, 0, 1.35);
      u.rSh.rotation.set(0, 0, -1.35);
      u.lArm.mid.rotation.x = -1.45;
      u.rArm.mid.rotation.x = -1.45;
    },
    update(p, u, mach) {
      // adduction horizontale : les bras abduits balaient vers l'avant jusqu'à se rejoindre
      u.lSh.rotation.y = -1.35 * p;
      u.rSh.rotation.y = 1.35 * p;
      u.lSh.rotation.z = 1.35 - p * 0.1;
      u.rSh.rotation.z = -(1.35 - p * 0.1);
      const butterfly = mach as ButterflyMachine | undefined;
      if (butterfly) {
        // les pads de la machine sont ouverts en p=0, fermés devant en p=1, suivant les bras
        butterfly.armL.rotation.y = 1.35 * (1 - p);
        butterfly.armR.rotation.y = -1.35 * (1 - p);
      }
    },
  },
  rower: {
    title: 'Rameur',
    cue: 'Séquence : jambes → tronc → bras. Retour inverse. Le tempo cale la cadence.',
    seated: true,
    machine: 'rower',
    figZ: true,
    tempo: { con: 0.8, ecc: 1.4 },
    setup(_mats, u) {
      u.lSh.rotation.z = 0.14;
      u.rSh.rotation.z = -0.14;
    },
    update(p, u, mach, fig) {
      // p : 0 = catch (jambes pliées, bras devant), 1 = finish (jambes tendues, buste en arrière)
      const torP = seg(p, 0.3, 0.75);
      const armP = seg(p, 0.55, 1.0);
      // le siège de l'athlète glisse ; le siège de la machine suit
      const figZ = 0.33 - p * 0.65;
      if (fig) fig.position.z = figZ;
      // jambes via IK — chevilles ancrées aux cale-pieds (y monde -1.0, z 1.05 ; fig y -0.62, échelle 0.9)
      const dy = -0.28;
      const dz = (1.05 - figZ) / 0.9;
      const leg = solveLeg(dy, dz);
      u.lHip.rotation.x = leg.hip;
      u.rHip.rotation.x = leg.hip;
      u.lLeg.mid.rotation.x = leg.knee;
      u.rLeg.mid.rotation.x = leg.knee;
      const ankle = -(leg.hip + leg.knee) + 0.3; // pieds à plat sur les cale-pieds inclinés
      u.lLeg.end.rotation.x = ankle;
      u.rLeg.end.rotation.x = ankle;
      // buste : penché avant au catch, en arrière au finish (pivot au bassin)
      u.upper.rotation.x = 0.32 - torP * 0.62;
      // bras : visent la poignée vers l'avant-bas au catch ; les coudes FLÉCHISSENT (jamais tendus)
      const shX = -1.0 + armP * 0.5;
      u.lSh.rotation.x = shX;
      u.rSh.rotation.x = shX;
      u.lArm.mid.rotation.x = -armP * 1.7;
      u.rArm.mid.rotation.x = -armP * 1.7;
      const rower = mach as RowerMachine | undefined;
      if (rower) {
        rower.seat.position.z = figZ;
        // la poignée suit les mains (épaule → main locale au rig, mise à l'échelle + inclinaison du buste)
        const lean = u.upper.rotation.x;
        const shY = -0.62 + 0.9 * (0.05 + 1.24 * Math.cos(lean));
        const shZ = figZ + 0.9 * (1.24 * Math.sin(lean));
        const a1 = lean + shX; // angle monde du bras haut (depuis la verticale basse)
        const a2 = a1 - armP * 1.7; // angle monde de l'avant-bras
        const handY = shY - 0.9 * (0.58 * Math.cos(a1) + 0.54 * Math.cos(a2));
        const handZ = shZ + 0.9 * (-0.58 * Math.sin(a1) - 0.54 * Math.sin(a2));
        rower.handle.position.y = handY;
        rower.handle.position.z = handZ;
        const chainLen = Math.max(0.15, 1.35 - handZ);
        rower.chain.scale.y = chainLen;
        rower.chain.position.z = chainLen / 2 + 0.05;
      }
    },
  },
};

// ---- scène / rendu (ce qui change vs le web : GLView expo-gl au lieu du DOM) ----

function createEnvironment(
  width: number,
  height: number,
  cam: [number, number, number],
  look: number
): { scene: THREE.Scene; camera: THREE.PerspectiveCamera; rim: THREE.DirectionalLight } {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(cam[0], cam[1], cam[2]);
  camera.lookAt(0, look, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(3, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(VOLT, 1.0);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
  const grid = new THREE.GridHelper(8, 16, VOLT, 0x2a2c24);
  const gridMaterial = grid.material as THREE.LineBasicMaterial;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.18;
  grid.position.y = -1.62;
  scene.add(grid);
  return { scene, camera, rim };
}

/** Dispose récursivement géométries + matériaux de la scène (meshes ET line segments/edges). */
function disposeScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    const target = object as unknown as {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    target.geometry?.dispose();
    if (Array.isArray(target.material)) {
      target.material.forEach((material) => material.dispose());
    } else {
      target.material?.dispose();
    }
  });
}

export interface GlSceneHandle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /**
   * Appelée à chaque frame active pour avancer l'anim (mutations three). Le rendu
   * (`renderer.render` + `gl.endFrameEXP`) est fait par `useGlScene` — ne pas l'appeler ici.
   */
  update: () => void;
}

interface ActiveGlScene extends GlSceneHandle {
  renderer: THREE.WebGLRenderer;
  gl: ExpoWebGLRenderingContext;
}

/**
 * Cycle de vie GL partagé entre `CoachCore` et `MovementDemoView` (était dupliqué mot pour mot) :
 * crée le renderer (shim `canvas` + `pixelRatio` plafonné), pilote la boucle
 * `requestAnimationFrame` et dispose (renderer + géométries/matériaux) au démontage — **pas** via
 * la valeur de retour de `onContextCreate` (expo-gl ne l'appelle jamais, voir `_poc-3d.tsx` sur
 * `feat/coach-3d`).
 *
 * Suspend la boucle RAF (sans jamais recréer le contexte GL — seulement le RAF est arrêté/relancé)
 * quand l'écran perd le focus (`useIsFocused` : la tab bar garde les écrans montés, donc sans ce
 * garde-fou le rig continuerait de rendre à 60 fps en tâche de fond) OU que l'app passe en
 * arrière-plan (`AppState`). Reprend au retour focus + foreground.
 */
function useGlScene(
  build: (gl: ExpoWebGLRenderingContext) => GlSceneHandle
): (gl: ExpoWebGLRenderingContext) => void {
  const isFocused = useIsFocused();

  const shouldRunRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const disposedRef = useRef(false);
  const activeRef = useRef<ActiveGlScene | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  /** (Re)lance le RAF si autorisé (focus + foreground) et pas déjà en cours ; l'arrête sinon. */
  const sync = useCallback(() => {
    if (disposedRef.current || !activeRef.current) return;
    if (shouldRunRef.current) {
      if (rafRef.current != null) return;
      const loop = () => {
        if (disposedRef.current) return;
        rafRef.current = requestAnimationFrame(loop);
        const active = activeRef.current;
        if (!active) return;
        active.update();
        active.renderer.render(active.scene, active.camera);
        active.gl.endFrameEXP();
      };
      loop();
    } else if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    shouldRunRef.current = isFocused && AppState.currentState === 'active';
    sync();
  }, [isFocused, sync]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      shouldRunRef.current = isFocused && state === 'active';
      sync();
    });
    return () => sub.remove();
  }, [isFocused, sync]);

  // Cleanup réel du cycle de vie GL/three au démontage : expo-gl n'appelle jamais la valeur de
  // retour de `onContextCreate` (ce n'est pas un hook React) — voir `_poc-3d.tsx` (feat/coach-3d).
  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      cleanupRef.current?.();
      cleanupRef.current = null;
      activeRef.current = null;
    };
  }, []);

  return useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      const width = gl.drawingBufferWidth;
      const glHeight = gl.drawingBufferHeight;
      const renderer = new THREE.WebGLRenderer({
        canvas: makeCanvas(gl, width, glHeight),
        // expo-gl fournit un contexte WebGL2 ; three attend WebGLRenderingContext dans ses types —
        // cast nécessaire, pattern documenté expo-three (identique à `_poc-3d.tsx`).
        context: gl as unknown as WebGLRenderingContext,
        antialias: false, // géométrie low-poly anguleuse : le liseré volt (EdgesGeometry) suffit
      });
      renderer.setPixelRatio(Math.min(PixelRatio.get(), 2));
      renderer.setSize(width, glHeight);
      renderer.setClearColor(INK, 1);

      const handle = build(gl);
      activeRef.current = { ...handle, renderer, gl };
      cleanupRef.current = () => {
        renderer.dispose();
        disposeScene(handle.scene);
      };
      sync();
    },
    [build, sync]
  );
}

export interface CoachCoreProps {
  /** `thinking` accélère la rotation/respiration et teinte le rig en warn (analyse en cours). */
  state?: 'brief' | 'thinking';
  height?: number;
}

/** Mini-scène idle du coach (respiration + rotation lente) — hero du chat Coach. */
export function CoachCore({ state = 'brief', height = 200 }: CoachCoreProps) {
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const build = useCallback((gl: ExpoWebGLRenderingContext): GlSceneHandle => {
    const width = gl.drawingBufferWidth;
    const glHeight = gl.drawingBufferHeight;
    const mats = createMats();
    const { scene, camera, rim } = createEnvironment(width, glHeight, [2.4, 1.2, 5.4], 0.4);

    const { fig, data } = buildCoach(mats);
    fig.position.y = 0.12;
    fig.scale.setScalar(0.92);
    scene.add(fig);

    let t = 0;
    const update = () => {
      t += 0.016;
      const thinking = stateRef.current === 'thinking';
      fig.rotation.y = Math.sin(t * 0.5 * (thinking ? 2 : 1)) * (thinking ? 0.5 : 0.3);
      data.torso.scale.setScalar(1 + Math.sin(t * 1.6) * 0.02);
      const gaze = thinking ? 0.9 + Math.sin(t * 3) * 0.35 : 0.2 + Math.sin(t * 1.2) * 0.05;
      data.rSh.rotation.z = -gaze;
      data.rArm.mid.rotation.x = 0.35 + (thinking ? Math.abs(Math.sin(t * 3)) * 0.5 : 0);
      data.lSh.rotation.z = 0.2 + Math.sin(t * 1.2 + 1) * 0.05;
      const tint = thinking ? WARN : VOLT;
      mats.edge.color.set(tint);
      mats.accent.color.set(tint);
      rim.color.set(tint);
    };

    return { scene, camera, update };
  }, []);

  const onContextCreate = useGlScene(build);

  return (
    <View style={{ width: '100%', height }}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
    </View>
  );
}

export interface MovementDemoProps {
  exercise: ExerciseId;
  tempo?: Tempo;
  height?: number;
}

interface MovementDemoViewProps {
  exercise: ExerciseId;
  tempo?: Tempo;
  height: number;
}

/** Scène montrant la machine + l'athlète exécutant le mouvement, pilotée par le tempo. */
function MovementDemoView({ exercise, tempo, height }: MovementDemoViewProps) {
  const build = useCallback(
    (gl: ExpoWebGLRenderingContext): GlSceneHandle => {
      const width = gl.drawingBufferWidth;
      const glHeight = gl.drawingBufferHeight;
      const mats = createMats();
      const ex = EX[exercise];
      const activeTempo = tempo ?? ex.tempo;
      const seated = ex.seated === true;
      const { scene, camera } = createEnvironment(
        width,
        glHeight,
        seated ? [3.9, 1.0, 5.9] : [3.4, 1.3, 5.4],
        seated ? -0.2 : 0.3
      );

      const { fig, data } = buildCoach(mats);
      fig.scale.setScalar(0.9);
      const rig = new THREE.Group();
      rig.add(fig);
      scene.add(rig);

      let mach: Machine | undefined;
      if (ex.machine === 'butterfly') {
        const butterfly = buildButterfly(mats);
        scene.add(butterfly.group);
        mach = butterfly;
        fig.position.set(0, -0.2, -0.15);
      } else if (ex.machine === 'rower') {
        const rower = buildRower(mats);
        scene.add(rower.group);
        mach = rower;
        fig.position.set(0, -0.62, 0.33);
      } else {
        fig.position.y = 0.06;
      }

      ex.setup(mats, data);

      let t = 0;
      const update = () => {
        t += 0.016;
        const p = tempoPhase(t, activeTempo);
        ex.update(p, data, mach, ex.figZ ? fig : null);
        rig.rotation.y = Math.sin(t * 0.25) * 0.28; // léger tourniquet de présentation
      };

      return { scene, camera, update };
    },
    [exercise, tempo]
  );

  const onContextCreate = useGlScene(build);

  return (
    <View style={{ width: '100%', height }}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
    </View>
  );
}

/**
 * Démo de mouvement (machine + athlète) pilotée par le tempo — bibliothèque de gestes (Moves).
 * Remonte entièrement (`key`) quand `exercise`/`tempo`/`height` changent : un nouveau contexte GL
 * doit être créé (expo-gl n'expose pas d'API pour reconfigurer une scène three existante), ce qui
 * démonte proprement l'ancienne instance (RAF annulé + dispose) avant de construire la nouvelle.
 */
export function MovementDemo({ exercise, tempo, height = 230 }: MovementDemoProps) {
  const tempoKey = tempo ? JSON.stringify(tempo) : 'default';
  return (
    <MovementDemoView
      key={`${exercise}-${tempoKey}-${height}`}
      exercise={exercise}
      tempo={tempo}
      height={height}
    />
  );
}
