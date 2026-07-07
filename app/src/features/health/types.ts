/**
 * Couche santé NEUTRE. Le reste de l'app ne connaît que cette interface :
 * ajouter Apple HealthKit plus tard = une implémentation supplémentaire de
 * `HealthProvider`, pas une réécriture. v1 = Health Connect (Android) uniquement.
 */

export interface DailyHealth {
  date: string; // YYYY-MM-DD
  steps: number;
  activeCalories: number; // kcal actives
}

export interface HealthProvider {
  readonly name: string;
  /** La source de données santé est-elle disponible sur cet appareil ? */
  isAvailable(): Promise<boolean>;
  /** Demande les permissions minimales (pas + calories actives). */
  requestPermissions(): Promise<boolean>;
  /** Résumé d'une journée. */
  getDailySummary(date: string): Promise<DailyHealth>;
}

export function emptyDay(date: string): DailyHealth {
  return { date, steps: 0, activeCalories: 0 };
}
