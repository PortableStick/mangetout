import type { MetricSetKey } from './metrics';
import type { EquipmentCategory, MuscleGroup } from './types';

/** Modèle d'équipement seedé (sans id/gym, ajoutés à la création). */
export interface EquipmentSeed {
  name: string;
  category: EquipmentCategory;
  muscleGroups: MuscleGroup[];
  /** Défaut rétro-compat au mapping repository si omis : 'strength'. */
  metricSet?: MetricSetKey;
}

/**
 * Matériel typique d'un club Basic-Fit (base par défaut, extensible).
 * ⚠️ L'équipement varie d'un club à l'autre → point de départ, modifiable.
 */
export const BASIC_FIT_EQUIPMENT: EquipmentSeed[] = [
  // Machines guidées
  { name: 'Presse à cuisses (leg press)', category: 'machine', muscleGroups: ['legs', 'glutes'] },
  { name: 'Leg extension', category: 'machine', muscleGroups: ['legs'] },
  { name: 'Leg curl', category: 'machine', muscleGroups: ['legs'] },
  { name: 'Hack squat', category: 'machine', muscleGroups: ['legs', 'glutes'] },
  { name: 'Adducteurs', category: 'machine', muscleGroups: ['legs'] },
  { name: 'Abducteurs', category: 'machine', muscleGroups: ['glutes', 'legs'] },
  { name: 'Mollets (calf)', category: 'machine', muscleGroups: ['calves'] },
  { name: 'Chest press', category: 'machine', muscleGroups: ['chest'] },
  { name: 'Pec deck', category: 'machine', muscleGroups: ['chest'] },
  { name: 'Développé épaules (shoulder press)', category: 'machine', muscleGroups: ['shoulders'] },
  { name: 'Tirage vertical (lat pulldown)', category: 'machine', muscleGroups: ['back', 'biceps'] },
  { name: 'Tirage horizontal (rowing)', category: 'machine', muscleGroups: ['back', 'biceps'] },
  { name: 'Pull-over', category: 'machine', muscleGroups: ['back', 'chest'] },
  { name: 'Biceps curl machine', category: 'machine', muscleGroups: ['biceps'] },
  { name: 'Triceps (dips / pushdown)', category: 'machine', muscleGroups: ['triceps'] },
  { name: 'Abdominal crunch machine', category: 'machine', muscleGroups: ['abs'] },
  { name: 'Lombaires (back extension)', category: 'machine', muscleGroups: ['back'] },
  { name: 'Smith machine', category: 'machine', muscleGroups: ['legs', 'chest', 'shoulders'] },
  // Poids libres
  { name: 'Haltères (2–30 kg)', category: 'free_weight', muscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  { name: 'Barres olympiques + disques', category: 'free_weight', muscleGroups: ['legs', 'back', 'chest', 'shoulders'] },
  { name: 'Bancs (plat/incliné/déclinable)', category: 'free_weight', muscleGroups: ['chest', 'shoulders'] },
  { name: 'Rack / cage à squat', category: 'free_weight', muscleGroups: ['legs', 'glutes', 'back'] },
  { name: 'Poulies / functional trainer', category: 'free_weight', muscleGroups: ['back', 'chest', 'shoulders', 'biceps', 'triceps'] },
  { name: 'Kettlebells', category: 'free_weight', muscleGroups: ['fullbody', 'glutes'] },
  // Cardio (Matrix)
  { name: 'Tapis de course', category: 'cardio', muscleGroups: ['cardio'], metricSet: 'cardio_run' },
  { name: 'Vélo (droit + couché)', category: 'cardio', muscleGroups: ['cardio', 'legs'], metricSet: 'cardio_bike' },
  { name: 'Vélo elliptique', category: 'cardio', muscleGroups: ['cardio', 'fullbody'], metricSet: 'cardio_generic' },
  { name: 'Rameur', category: 'cardio', muscleGroups: ['cardio', 'back', 'legs'], metricSet: 'cardio_row' },
  {
    name: 'Stepper / monte-escaliers',
    category: 'cardio',
    muscleGroups: ['cardio', 'legs', 'glutes'],
    metricSet: 'cardio_generic',
  },
  // Fonctionnel
  { name: 'Medecine ball', category: 'functional', muscleGroups: ['abs', 'fullbody'] },
  { name: 'Swiss ball', category: 'functional', muscleGroups: ['abs'] },
  { name: 'Box jump', category: 'functional', muscleGroups: ['legs', 'glutes'] },
  { name: 'Cordes ondulatoires', category: 'functional', muscleGroups: ['fullbody', 'cardio'] },
  { name: 'TRX / sangles', category: 'functional', muscleGroups: ['fullbody', 'back'] },
  { name: 'Tapis', category: 'functional', muscleGroups: ['abs'] },
];

export const DEFAULT_GYMS = {
  basicFit: { name: 'Basic-Fit', gymType: 'chain' as const },
  home: { name: 'Salle perso', gymType: 'home' as const },
};
