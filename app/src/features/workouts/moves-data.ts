/**
 * Bibliothèque de gestes — données extraites du handoff design system
 * (`ui_kits/app/CoachRig.jsx`, objet `EX` / `window.COACH_EXERCISES`) pour l'écran `moves.tsx`.
 *
 * Seuls `id`/`title`/`cue` (FR) sont consommés par l'écran actuel. `tempo` (concentrique/excentrique/
 * pauses, en secondes) est recopié tel quel depuis le handoff pour le futur rig 3D (`MovementDemo`,
 * M24) — pas encore utilisé par le placeholder de `moves.tsx`.
 */

/** Durées de phase (secondes) d'un tempo d'exécution. */
export interface MoveTempo {
  con: number;
  ecc: number;
  /** Pause en position basse (bas du mouvement). */
  holdB?: number;
  /** Pause en position haute (top du mouvement). */
  holdT?: number;
}

export interface Move {
  id: string;
  title: string;
  cue: string;
  tempo: MoveTempo;
}

export const MOVES: Move[] = [
  {
    id: 'dumbbells',
    title: 'Haltères',
    cue: 'Coude fixe, pas d’élan. Le tempo mène le mouvement.',
    tempo: { con: 1, ecc: 3 },
  },
  {
    id: 'butterfly',
    title: 'Butterfly (pec-deck)',
    cue: 'Ouvre grand, resserre devant la poitrine. Coudes à hauteur d’épaule.',
    tempo: { con: 1.5, ecc: 2, holdT: 0.3 },
  },
  {
    id: 'rower',
    title: 'Rameur',
    cue: 'Séquence : jambes → tronc → bras. Retour inverse. Le tempo cale la cadence.',
    tempo: { con: 0.8, ecc: 1.4 },
  },
];

/** Preset de tempo sélectionnable (recopié de `MOVE_TEMPOS`, `ui_kits/app/MovesScreen.jsx`). */
export interface MoveTempoPreset {
  key: string;
  /** Libellé affiché, ex. `2·0·2`. */
  label: string;
  /** Sous-libellé (nom du style de tempo). */
  sub: string;
  tempo: MoveTempo;
}

export const MOVE_TEMPOS: MoveTempoPreset[] = [
  { key: '2-0-2', label: '2·0·2', sub: 'Contrôlé', tempo: { con: 2, ecc: 2 } },
  { key: '1-0-3', label: '1·0·3', sub: 'Négatif', tempo: { con: 1, ecc: 3 } },
  { key: '3-1-1', label: '3·1·1', sub: 'Excentrique', tempo: { con: 1, ecc: 3, holdB: 0, holdT: 1 } },
  { key: '1-0-1', label: '1·0·1', sub: 'Explosif', tempo: { con: 1, ecc: 1 } },
];
