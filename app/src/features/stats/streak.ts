/** Décale une date YYYY-MM-DD de `delta` jours (UTC, pur). */
export function addDays(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * Streak = nombre de jours consécutifs AVEC activité se terminant aujourd'hui.
 * Tolère qu'aujourd'hui soit vide si hier ne l'est pas ? Non : streak strict
 * jusqu'à aujourd'hui inclus (0 si rien aujourd'hui).
 */
export function computeStreak(datesWithActivity: Iterable<string>, today: string): number {
  const set = new Set(datesWithActivity);
  let streak = 0;
  let cursor = today;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
