import { describe, expect, it } from '@jest/globals';

import { chartGeometry, sortByDate, toPolyline, weightStats, type WeightEntry } from './weight';

const e = (date: string, weight_kg: number): WeightEntry => ({ id: date, date, weight_kg });

describe('weight', () => {
  it('trie par date ascendante', () => {
    const sorted = sortByDate([e('2026-03-02', 80), e('2026-03-01', 81)]);
    expect(sorted.map((x) => x.date)).toEqual(['2026-03-01', '2026-03-02']);
  });

  it('calcule delta / min / max sur des entrées non triées', () => {
    const s = weightStats([e('2026-03-03', 79.4), e('2026-03-01', 81), e('2026-03-02', 80.2)]);
    expect(s.first).toBe(81);
    expect(s.latest).toBe(79.4);
    expect(s.delta).toBe(-1.6);
    expect(s.min).toBe(79.4);
    expect(s.max).toBe(81);
    expect(s.count).toBe(3);
  });

  it('série vide → stats neutres', () => {
    expect(weightStats([])).toEqual({ delta: 0, count: 0 });
  });

  it('projette min en bas et max en haut (y inversé)', () => {
    const { points } = chartGeometry([70, 80], 100, 100, 10);
    // 70 (min) → y le plus grand (bas) ; 80 (max) → y le plus petit (haut)
    expect(points[0]!.y).toBeGreaterThan(points[1]!.y);
    expect(points[0]!.x).toBeCloseTo(10);
    expect(points[1]!.x).toBeCloseTo(90);
  });

  it('un seul point est centré horizontalement', () => {
    const { points } = chartGeometry([75], 100, 100, 10);
    expect(points[0]!.x).toBeCloseTo(50);
  });

  it('sérialise une polyline SVG', () => {
    expect(toPolyline([{ x: 1, y: 2 }, { x: 3.14159, y: 4 }])).toBe('1.0,2.0 3.1,4.0');
  });
});
