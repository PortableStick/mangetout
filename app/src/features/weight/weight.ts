/** Suivi du poids / mensurations. Unités métriques (kg, cm). */

export interface WeightEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weight_kg: number;
  /** Mensurations optionnelles (tour de taille, etc.), en cm. */
  measurements?: Record<string, number>;
}

/** Tri chronologique ascendant (par date ISO). */
export function sortByDate<T extends { date: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

export interface WeightStats {
  latest?: number;
  first?: number;
  /** Variation entre la première et la dernière pesée (kg, arrondi 0,1). */
  delta: number;
  min?: number;
  max?: number;
  count: number;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Statistiques de tendance sur des entrées déjà triées ou non. */
export function weightStats(entries: WeightEntry[]): WeightStats {
  const sorted = sortByDate(entries);
  if (sorted.length === 0) return { delta: 0, count: 0 };
  const values = sorted.map((e) => e.weight_kg);
  const first = values[0]!;
  const latest = values[values.length - 1]!;
  return {
    latest,
    first,
    delta: round1(latest - first),
    min: Math.min(...values),
    max: Math.max(...values),
    count: sorted.length,
  };
}

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartGeometry {
  points: ChartPoint[];
  min: number;
  max: number;
}

/**
 * Projette une série de valeurs dans un repère (x = index régulier, y inversé :
 * la valeur max est en haut). Padding pour ne pas coller aux bords.
 */
export function chartGeometry(
  values: number[],
  width: number,
  height: number,
  pad = 10
): ChartGeometry {
  if (values.length === 0) return { points: [], min: 0, max: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerW = Math.max(1, width - 2 * pad);
  const innerH = Math.max(1, height - 2 * pad);
  const points = values.map((v, i) => ({
    x: pad + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW),
    y: pad + (1 - (v - min) / range) * innerH,
  }));
  return { points, min, max };
}

export function toPolyline(points: ChartPoint[]): string {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}
