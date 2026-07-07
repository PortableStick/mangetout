import { describe, expect, it } from '@jest/globals';

import { addDays, computeStreak } from './streak';

describe('streak', () => {
  it('addDays gère le passage de mois', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('compte les jours consécutifs jusqu’à aujourd’hui', () => {
    expect(computeStreak(['2026-07-07', '2026-07-06', '2026-07-05'], '2026-07-07')).toBe(3);
  });

  it('s’arrête à la première coupure', () => {
    expect(computeStreak(['2026-07-07', '2026-07-05', '2026-07-04'], '2026-07-07')).toBe(1);
  });

  it('0 si rien aujourd’hui', () => {
    expect(computeStreak(['2026-07-06'], '2026-07-07')).toBe(0);
  });
});
