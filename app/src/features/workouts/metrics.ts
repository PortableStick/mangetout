import { z } from 'zod';

/**
 * Catalogue FERMÉ des champs de série + presets `metric_set` par type d'équipement.
 * Module pur (sans React) — sert à générer les formulaires de saisie de séries
 * et à valider les valeurs saisies selon le type d'exercice (muscu, cardio, isométrique…).
 */

export type MetricKey =
  | 'reps'
  | 'weight_kg'
  | 'added_weight_kg'
  | 'assist_weight_kg'
  | 'duration_s'
  | 'distance_m'
  | 'pace_split_500m'
  | 'speed_kmh'
  | 'watts'
  | 'cadence_rpm'
  | 'cadence_spm'
  | 'incline_pct'
  | 'heart_rate_bpm'
  | 'rpe'
  | 'set_type';

export type MetricKind = 'int' | 'float' | 'duration' | 'enum';

export interface MetricField {
  key: MetricKey;
  label: string;
  unit: string;
  kind: MetricKind;
  min?: number;
  max?: number;
  options?: string[];
  optional?: boolean;
}

/**
 * Catalogue fermé : toute clé de metric_set doit exister ici.
 * NOTE : `optional` ici est un DÉFAUT informatif (non utilisé par `setSchema`/`fieldsFor`,
 * voir `METRIC_SET_REQUIRED` ci-dessous) — un même champ peut être requis dans un preset
 * (ex. `reps` en `strength`) et optionnel dans un autre. La source de vérité pour la
 * validation est `METRIC_SET_REQUIRED`, PAR PRESET.
 */
export const METRIC_FIELDS: Record<MetricKey, MetricField> = {
  reps: { key: 'reps', label: 'Répétitions', unit: '', kind: 'int', min: 0, max: 1000 },
  weight_kg: { key: 'weight_kg', label: 'Charge', unit: 'kg', kind: 'float', min: 0, max: 1000 },
  added_weight_kg: {
    key: 'added_weight_kg',
    label: 'Charge ajoutée',
    unit: 'kg',
    kind: 'float',
    min: 0,
    max: 500,
    optional: true,
  },
  assist_weight_kg: {
    key: 'assist_weight_kg',
    label: 'Assistance',
    unit: 'kg',
    kind: 'float',
    min: 0,
    max: 500,
    optional: true,
  },
  duration_s: { key: 'duration_s', label: 'Durée', unit: 's', kind: 'duration', min: 0, max: 86400 },
  distance_m: {
    key: 'distance_m',
    label: 'Distance',
    unit: 'm',
    kind: 'int',
    min: 0,
    max: 100000,
    optional: true,
  },
  pace_split_500m: {
    key: 'pace_split_500m',
    label: 'Split /500m',
    unit: 's',
    kind: 'duration',
    min: 0,
    max: 600,
    optional: true,
  },
  speed_kmh: {
    key: 'speed_kmh',
    label: 'Vitesse',
    unit: 'km/h',
    kind: 'float',
    min: 0,
    max: 60,
    optional: true,
  },
  watts: { key: 'watts', label: 'Puissance', unit: 'W', kind: 'int', min: 0, max: 3000, optional: true },
  cadence_rpm: {
    key: 'cadence_rpm',
    label: 'Cadence',
    unit: 'rpm',
    kind: 'int',
    min: 0,
    max: 400,
    optional: true,
  },
  cadence_spm: {
    key: 'cadence_spm',
    label: 'Cadence',
    unit: 'spm',
    kind: 'int',
    min: 0,
    max: 400,
    optional: true,
  },
  incline_pct: {
    key: 'incline_pct',
    label: 'Inclinaison',
    unit: '%',
    kind: 'float',
    min: 0,
    max: 45,
    optional: true,
  },
  heart_rate_bpm: {
    key: 'heart_rate_bpm',
    label: 'FC',
    unit: 'bpm',
    kind: 'int',
    min: 0,
    max: 250,
    optional: true,
  },
  rpe: { key: 'rpe', label: 'RPE', unit: '', kind: 'int', min: 6, max: 10, optional: true },
  set_type: {
    key: 'set_type',
    label: 'Type',
    unit: '',
    kind: 'enum',
    options: ['normal', 'warmup', 'dropset', 'failure'],
    optional: true,
  },
};

export type MetricSetKey =
  | 'strength'
  | 'bodyweight'
  | 'assisted'
  | 'isometric'
  | 'cardio_row'
  | 'cardio_bike'
  | 'cardio_run'
  | 'cardio_generic';

/** Preset → liste ORDONNÉE de clés de champs (ordre d'affichage/saisie). */
export const METRIC_SETS: Record<MetricSetKey, MetricKey[]> = {
  strength: ['reps', 'weight_kg', 'rpe', 'set_type'],
  bodyweight: ['reps', 'added_weight_kg'],
  assisted: ['reps', 'assist_weight_kg'],
  isometric: ['duration_s'],
  cardio_row: ['duration_s', 'distance_m', 'pace_split_500m', 'cadence_spm', 'watts'],
  cardio_bike: ['duration_s', 'distance_m', 'watts', 'cadence_rpm', 'heart_rate_bpm'],
  cardio_run: ['duration_s', 'distance_m', 'speed_kmh', 'incline_pct', 'heart_rate_bpm'],
  cardio_generic: ['duration_s', 'distance_m', 'heart_rate_bpm'],
};

/**
 * Preset → clés REQUISES (le reste des clés du preset, cf. `METRIC_SETS`, est optionnel).
 * Source de vérité de l'« optionnalité » : PAR PRESET, pas globale à `METRIC_FIELDS`
 * (un même champ, ex. `reps`, est requis en `strength`/`bodyweight`/`assisted` mais n'existe
 * même pas dans les presets cardio). Chaque preset cardio ne garde qu'UN champ primaire requis
 * (`duration_s`) : une série cardio réaliste (rameur = durée+distance, tapis sans inclinaison…)
 * ne doit pas échouer la validation faute de champs secondaires (FIX perte de données silencieuse).
 */
export const METRIC_SET_REQUIRED: Record<MetricSetKey, MetricKey[]> = {
  strength: ['reps', 'weight_kg'],
  bodyweight: ['reps'],
  assisted: ['reps'],
  isometric: ['duration_s'],
  cardio_row: ['duration_s'],
  cardio_bike: ['duration_s'],
  cardio_run: ['duration_s'],
  cardio_generic: ['duration_s'],
};

/** `MetricField[]` dans l'ordre du preset, `optional` recalculé PAR PRESET (`METRIC_SET_REQUIRED`). */
export function fieldsFor(set: MetricSetKey): MetricField[] {
  const required = new Set(METRIC_SET_REQUIRED[set]);
  return METRIC_SETS[set].map((key) => ({ ...METRIC_FIELDS[key], optional: !required.has(key) }));
}

/** Schéma zod validant une série saisie selon son metric_set (bornes + champs requis/optionnels par preset). */
export function setSchema(set: MetricSetKey): z.ZodType {
  const shape: Record<string, z.ZodType> = {};

  for (const field of fieldsFor(set)) {
    const base: z.ZodType =
      field.kind === 'enum'
        ? z.enum(field.options as [string, ...string[]])
        : z.number().min(field.min ?? -Infinity).max(field.max ?? Infinity);

    shape[field.key] = field.optional ? base.optional() : base;
  }

  return z.object(shape);
}
