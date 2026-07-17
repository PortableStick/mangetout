import { describe, it, expect } from '@jest/globals';

import { EXERCISE_LIBRARY, findExerciseInfo, normalizeExerciseName } from './exerciseLibrary';
import { METRIC_SETS } from './metrics';
import { POSES } from './pose3d/poses';
import { MUSCLE_LABELS } from './types';

const VALID_MUSCLES = new Set(Object.keys(MUSCLE_LABELS));
const VALID_SETS = new Set(Object.keys(METRIC_SETS));
const VALID_CATEGORIES = new Set(['machine', 'free_weight', 'cardio', 'functional']);

describe('exerciseLibrary — intégrité des données', () => {
  it('les slugs sont uniques et en kebab-case', () => {
    const slugs = EXERCISE_LIBRARY.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it('chaque exercice cible des muscles et un metricSet valides', () => {
    for (const e of EXERCISE_LIBRARY) {
      expect(VALID_CATEGORIES.has(e.category)).toBe(true);
      expect(VALID_SETS.has(e.metricSet)).toBe(true);
      expect(e.primary.length).toBeGreaterThan(0);
      for (const m of [...e.primary, ...e.secondary]) {
        expect(VALID_MUSCLES.has(m)).toBe(true);
        if (!VALID_MUSCLES.has(m)) throw new Error(`${e.slug}: muscle inconnu ${m}`);
      }
    }
  });

  it('primaire et secondaire ne se chevauchent pas', () => {
    for (const e of EXERCISE_LIBRARY) {
      const overlap = e.secondary.filter((m) => e.primary.includes(m));
      expect(overlap).toEqual([]);
    }
  });

  it('chaque poseId référencé existe dans POSES', () => {
    for (const e of EXERCISE_LIBRARY) {
      if (e.poseId) {
        expect(POSES[e.poseId]).toBeDefined();
        if (!POSES[e.poseId]) throw new Error(`${e.slug}: poseId orphelin ${e.poseId}`);
      }
    }
  });

  it('chaque fiche a des étapes, conseils et erreurs non vides', () => {
    for (const e of EXERCISE_LIBRARY) {
      expect(e.steps.length).toBeGreaterThan(0);
      expect(e.tips.length).toBeGreaterThan(0);
      expect(e.mistakes.length).toBeGreaterThan(0);
      expect(e.name.length).toBeGreaterThan(0);
    }
  });
});

describe('normalizeExerciseName', () => {
  it('minusculise, retire accents, parenthèses et ponctuation', () => {
    expect(normalizeExerciseName('Développé couché')).toBe('developpe couche');
    expect(normalizeExerciseName('Mollets (calf raises)')).toBe('mollets');
    expect(normalizeExerciseName('Rack / cage à squat')).toBe('rack cage a squat');
  });

  it('chaîne vide ou symboles seuls → vide', () => {
    expect(normalizeExerciseName('   ')).toBe('');
    expect(normalizeExerciseName('()')).toBe('');
  });
});

describe('findExerciseInfo — résolution de nom libre', () => {
  it('résout par nom exact insensible aux accents/casse', () => {
    expect(findExerciseInfo('développé couché')?.slug).toBe('developpe-couche');
    expect(findExerciseInfo('SQUAT BARRE')?.slug).toBe('squat');
  });

  it('résout par slug', () => {
    expect(findExerciseInfo('hack-squat')?.slug).toBe('hack-squat');
  });

  it('résout par alias (dont noms d’équipement du seed)', () => {
    expect(findExerciseInfo('leg press')?.slug).toBe('presse-a-cuisses');
    expect(findExerciseInfo('bench press')?.slug).toBe('developpe-couche');
    expect(findExerciseInfo('concept2')?.slug).toBe('rameur');
  });

  it('résout par inclusion en privilégiant le plus long alias', () => {
    expect(findExerciseInfo('développé couché haltères lourds')?.slug).toBe('developpe-couche');
  });

  it('renvoie undefined pour un nom vide ou inconnu', () => {
    expect(findExerciseInfo('')).toBeUndefined();
    expect(findExerciseInfo('xyzabc123')).toBeUndefined();
  });

  it('ignore les correspondances trop courtes (< 4 caractères)', () => {
    // "abc" ne doit correspondre à rien par inclusion
    expect(findExerciseInfo('abc')).toBeUndefined();
  });
});
