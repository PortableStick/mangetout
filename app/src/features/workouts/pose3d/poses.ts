/**
 * Poses 3D par exercice : deux keyframes (départ → fin de répétition),
 * interpolées en boucle par le viewer. Angles en degrés (voir skeleton.ts) :
 * spine/bras/jambes au repos = debout bras le long du corps, pieds vers +Z.
 * rx < 0 sur un bras/une cuisse = flexion vers l'avant ; rz = abduction (±X).
 */

import type { Pose } from './skeleton';

export interface ExercisePose {
  /** Libellé court affiché sous le viewer. */
  label: string;
  start: Pose;
  end: Pose;
  /** Durée d'un aller (ms) — le retour dure autant. */
  durationMs: number;
  /** Orientation caméra conseillée (yaw en degrés, 0 = face). */
  cameraYaw: number;
}

const standing: Pose = { bones: {} };

export const POSES: Record<string, ExercisePose> = {
  squat: {
    label: 'Flexion — cuisses parallèles, dos neutre',
    cameraYaw: 55,
    durationMs: 1600,
    start: {
      bones: {
        upperArmL: [15, 0, -75],
        upperArmR: [15, 0, 75],
        forearmL: [-110, 0, 0],
        forearmR: [-110, 0, 0],
      },
    },
    end: {
      root: [0, 0, 0],
      bones: {
        spine: [28, 0, 0],
        upperArmL: [15, 0, -75],
        upperArmR: [15, 0, 75],
        forearmL: [-110, 0, 0],
        forearmR: [-110, 0, 0],
        thighL: [-102, 0, -6],
        thighR: [-102, 0, 6],
        shinL: [112, 0, 0],
        shinR: [112, 0, 0],
        footL: [-12, 0, 0],
        footR: [-12, 0, 0],
      },
    },
  },
  deadlift: {
    label: 'Charnière de hanche, barre au contact des jambes',
    cameraYaw: 60,
    durationMs: 1700,
    start: {
      bones: {
        spine: [42, 0, 0],
        upperArmL: [-42, 0, 0],
        upperArmR: [-42, 0, 0],
        thighL: [-48, 0, -4],
        thighR: [-48, 0, 4],
        shinL: [34, 0, 0],
        shinR: [34, 0, 0],
        footL: [10, 0, 0],
        footR: [10, 0, 0],
      },
    },
    end: standing,
  },
  lunge: {
    label: 'Fente — genou arrière vers le sol',
    cameraYaw: 70,
    durationMs: 1500,
    start: standing,
    end: {
      bones: {
        spine: [8, 0, 0],
        thighL: [-72, 0, 0],
        shinL: [78, 0, 0],
        footL: [-8, 0, 0],
        thighR: [28, 0, 0],
        shinR: [62, 0, 0],
        footR: [38, 0, 0],
      },
    },
  },
  'hip-thrust': {
    label: 'Extension de hanche, alignement épaules-genoux',
    cameraYaw: 75,
    durationMs: 1400,
    start: {
      root: [-55, 0, 0],
      rootY: 0.35,
      bones: {
        spine: [-10, 0, 0],
        upperArmL: [0, 0, -55],
        upperArmR: [0, 0, 55],
        thighL: [-58, 0, -5],
        thighR: [-58, 0, 5],
        shinL: [92, 0, 0],
        shinR: [92, 0, 0],
        footL: [-35, 0, 0],
        footR: [-35, 0, 0],
      },
    },
    end: {
      root: [-82, 0, 0],
      rootY: 0.55,
      bones: {
        spine: [-4, 0, 0],
        upperArmL: [0, 0, -55],
        upperArmR: [0, 0, 55],
        thighL: [-16, 0, -5],
        thighR: [-16, 0, 5],
        shinL: [96, 0, 0],
        shinR: [96, 0, 0],
        footL: [-15, 0, 0],
        footR: [-15, 0, 0],
      },
    },
  },
  'leg-press': {
    label: 'Pousser dans les talons, dos plaqué',
    cameraYaw: 80,
    durationMs: 1500,
    start: {
      root: [-42, 0, 0],
      rootY: 0.45,
      bones: {
        spine: [-6, 0, 0],
        upperArmL: [10, 0, -12],
        upperArmR: [10, 0, 12],
        forearmL: [-35, 0, 0],
        forearmR: [-35, 0, 0],
        thighL: [-68, 0, -5],
        thighR: [-68, 0, 5],
        shinL: [96, 0, 0],
        shinR: [96, 0, 0],
        footL: [-30, 0, 0],
        footR: [-30, 0, 0],
      },
    },
    end: {
      root: [-42, 0, 0],
      rootY: 0.45,
      bones: {
        spine: [-6, 0, 0],
        upperArmL: [10, 0, -12],
        upperArmR: [10, 0, 12],
        forearmL: [-35, 0, 0],
        forearmR: [-35, 0, 0],
        thighL: [-26, 0, -5],
        thighR: [-26, 0, 5],
        shinL: [22, 0, 0],
        shinR: [22, 0, 0],
        footL: [-30, 0, 0],
        footR: [-30, 0, 0],
      },
    },
  },
  'bench-press': {
    label: 'Développé — barre au-dessus de la poitrine',
    cameraYaw: 65,
    durationMs: 1500,
    start: {
      root: [-80, 0, 0],
      rootY: 0.42,
      bones: {
        thighL: [-64, 0, -5],
        thighR: [-64, 0, 5],
        shinL: [86, 0, 0],
        shinR: [86, 0, 0],
        footL: [-22, 0, 0],
        footR: [-22, 0, 0],
        upperArmL: [95, 0, -35],
        upperArmR: [95, 0, 35],
        forearmL: [-88, 0, 0],
        forearmR: [-88, 0, 0],
      },
    },
    end: {
      root: [-80, 0, 0],
      rootY: 0.42,
      bones: {
        thighL: [-64, 0, -5],
        thighR: [-64, 0, 5],
        shinL: [86, 0, 0],
        shinR: [86, 0, 0],
        footL: [-22, 0, 0],
        footR: [-22, 0, 0],
        upperArmL: [95, 0, -8],
        upperArmR: [95, 0, 8],
        forearmL: [-6, 0, 0],
        forearmR: [-6, 0, 0],
      },
    },
  },
  'push-up': {
    label: 'Corps gainé d’un bloc, poitrine vers le sol',
    cameraYaw: 70,
    durationMs: 1400,
    start: {
      root: [78, 0, 0],
      rootY: 0.6,
      bones: {
        spine: [4, 0, 0],
        head: [-35, 0, 0],
        thighL: [4, 0, -3],
        thighR: [4, 0, 3],
        footL: [55, 0, 0],
        footR: [55, 0, 0],
        upperArmL: [-82, 0, -8],
        upperArmR: [-82, 0, 8],
      },
    },
    end: {
      root: [80, 0, 0],
      rootY: 0.34,
      bones: {
        spine: [4, 0, 0],
        head: [-35, 0, 0],
        thighL: [4, 0, -3],
        thighR: [4, 0, 3],
        footL: [55, 0, 0],
        footR: [55, 0, 0],
        upperArmL: [-38, 0, -32],
        upperArmR: [-38, 0, 32],
        forearmL: [-52, 0, 0],
        forearmR: [-52, 0, 0],
      },
    },
  },
  plank: {
    label: 'Position tenue — alignement tête-bassin-chevilles',
    cameraYaw: 70,
    durationMs: 2400,
    start: {
      root: [78, 0, 0],
      rootY: 0.42,
      bones: {
        spine: [2, 0, 0],
        head: [-30, 0, 0],
        thighL: [6, 0, -3],
        thighR: [6, 0, 3],
        footL: [55, 0, 0],
        footR: [55, 0, 0],
        upperArmL: [-50, 0, -6],
        upperArmR: [-50, 0, 6],
        forearmL: [-95, 0, 0],
        forearmR: [-95, 0, 0],
      },
    },
    end: {
      root: [78, 0, 0],
      rootY: 0.44,
      bones: {
        spine: [2, 0, 0],
        head: [-30, 0, 0],
        thighL: [6, 0, -3],
        thighR: [6, 0, 3],
        footL: [55, 0, 0],
        footR: [55, 0, 0],
        upperArmL: [-50, 0, -6],
        upperArmR: [-50, 0, 6],
        forearmL: [-95, 0, 0],
        forearmR: [-95, 0, 0],
      },
    },
  },
  'pull-up': {
    label: 'Menton au-dessus de la barre, sans élan',
    cameraYaw: 35,
    durationMs: 1600,
    start: {
      rootY: 1.15,
      bones: {
        upperArmL: [0, 0, -168],
        upperArmR: [0, 0, 168],
        shinL: [35, 0, 0],
        shinR: [35, 0, 0],
      },
    },
    end: {
      rootY: 1.45,
      bones: {
        upperArmL: [0, 0, -135],
        upperArmR: [0, 0, 135],
        forearmL: [0, 0, 95],
        forearmR: [0, 0, -95],
        shinL: [55, 0, 0],
        shinR: [55, 0, 0],
      },
    },
  },
  'lat-pulldown': {
    label: 'Tirer vers la poitrine en abaissant les omoplates',
    cameraYaw: 30,
    durationMs: 1500,
    start: {
      bones: {
        thighL: [-88, 0, -6],
        thighR: [-88, 0, 6],
        shinL: [92, 0, 0],
        shinR: [92, 0, 0],
        upperArmL: [0, 0, -160],
        upperArmR: [0, 0, 160],
      },
    },
    end: {
      bones: {
        spine: [-6, 0, 0],
        thighL: [-88, 0, -6],
        thighR: [-88, 0, 6],
        shinL: [92, 0, 0],
        shinR: [92, 0, 0],
        upperArmL: [0, 0, -105],
        upperArmR: [0, 0, 105],
        forearmL: [0, 0, 100],
        forearmR: [0, 0, -100],
      },
    },
  },
  'seated-row': {
    label: 'Coudes vers l’arrière, buste immobile',
    cameraYaw: 75,
    durationMs: 1500,
    start: {
      bones: {
        thighL: [-72, 0, -5],
        thighR: [-72, 0, 5],
        shinL: [30, 0, 0],
        shinR: [30, 0, 0],
        spine: [12, 0, 0],
        upperArmL: [-88, 0, -5],
        upperArmR: [-88, 0, 5],
      },
    },
    end: {
      bones: {
        thighL: [-72, 0, -5],
        thighR: [-72, 0, 5],
        shinL: [30, 0, 0],
        shinR: [30, 0, 0],
        spine: [-4, 0, 0],
        upperArmL: [-18, 0, -5],
        upperArmR: [-18, 0, 5],
        forearmL: [-72, 0, 0],
        forearmR: [-72, 0, 0],
      },
    },
  },
  'shoulder-press': {
    label: 'Pousser au-dessus de la tête sans cambrer',
    cameraYaw: 25,
    durationMs: 1500,
    start: {
      bones: {
        thighL: [-88, 0, -6],
        thighR: [-88, 0, 6],
        shinL: [92, 0, 0],
        shinR: [92, 0, 0],
        upperArmL: [0, 0, -78],
        upperArmR: [0, 0, 78],
        forearmL: [0, 0, -98],
        forearmR: [0, 0, 98],
      },
    },
    end: {
      bones: {
        thighL: [-88, 0, -6],
        thighR: [-88, 0, 6],
        shinL: [92, 0, 0],
        shinR: [92, 0, 0],
        upperArmL: [0, 0, -168],
        upperArmR: [0, 0, 168],
        forearmL: [0, 0, -6],
        forearmR: [0, 0, 6],
      },
    },
  },
  'lateral-raise': {
    label: 'Monter à l’horizontale, sans élan',
    cameraYaw: 15,
    durationMs: 1400,
    start: {
      bones: {
        upperArmL: [0, 0, -8],
        upperArmR: [0, 0, 8],
        forearmL: [-10, 0, 0],
        forearmR: [-10, 0, 0],
      },
    },
    end: {
      bones: {
        upperArmL: [0, 0, -88],
        upperArmR: [0, 0, 88],
        forearmL: [-10, 0, 0],
        forearmR: [-10, 0, 0],
      },
    },
  },
  'biceps-curl': {
    label: 'Coudes fixes le long du corps',
    cameraYaw: 45,
    durationMs: 1300,
    start: {
      bones: {
        forearmL: [-8, 0, 0],
        forearmR: [-8, 0, 0],
      },
    },
    end: {
      bones: {
        forearmL: [-132, 0, 0],
        forearmR: [-132, 0, 0],
      },
    },
  },
  'kb-swing': {
    label: 'Extension de hanche explosive',
    cameraYaw: 65,
    durationMs: 1200,
    start: {
      bones: {
        spine: [38, 0, 0],
        thighL: [-34, 0, -6],
        thighR: [-34, 0, 6],
        shinL: [18, 0, 0],
        shinR: [18, 0, 0],
        upperArmL: [-30, 0, 0],
        upperArmR: [-30, 0, 0],
      },
    },
    end: {
      bones: {
        upperArmL: [-88, 0, 0],
        upperArmR: [-88, 0, 0],
      },
    },
  },
  rowing: {
    label: 'Jambes → buste → bras, puis retour inverse',
    cameraYaw: 80,
    durationMs: 1600,
    start: {
      rootY: 0.3,
      bones: {
        spine: [22, 0, 0],
        thighL: [-82, 0, -5],
        thighR: [-82, 0, 5],
        shinL: [105, 0, 0],
        shinR: [105, 0, 0],
        footL: [-25, 0, 0],
        footR: [-25, 0, 0],
        upperArmL: [-70, 0, 0],
        upperArmR: [-70, 0, 0],
      },
    },
    end: {
      rootY: 0.3,
      bones: {
        spine: [-14, 0, 0],
        thighL: [-58, 0, -5],
        thighR: [-58, 0, 5],
        shinL: [26, 0, 0],
        shinR: [26, 0, 0],
        footL: [15, 0, 0],
        footR: [15, 0, 0],
        upperArmL: [8, 0, 0],
        upperArmR: [8, 0, 0],
        forearmL: [-65, 0, 0],
        forearmR: [-65, 0, 0],
      },
    },
  },
};

/** Récupère la pose d'un exercice (undefined si pas encore modélisée). */
export function poseFor(poseId: string | undefined): ExercisePose | undefined {
  return poseId ? POSES[poseId] : undefined;
}
