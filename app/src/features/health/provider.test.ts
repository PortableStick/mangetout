import { describe, expect, it } from '@jest/globals';

import { nullHealthProvider } from './nullProvider';
import { pickProvider } from './provider';
import type { HealthProvider } from './types';

const fakeAndroid: HealthProvider = {
  name: 'health-connect',
  isAvailable: async () => true,
  requestPermissions: async () => true,
  getDailySummary: async (date) => ({ date, steps: 1, activeCalories: 1 }),
};

describe('health provider selection', () => {
  it('choisit Health Connect sur Android', () => {
    expect(pickProvider('android', fakeAndroid, nullHealthProvider).name).toBe('health-connect');
  });

  it('choisit le provider inerte hors Android', () => {
    expect(pickProvider('ios', fakeAndroid, nullHealthProvider).name).toBe('none');
    expect(pickProvider('web', fakeAndroid, nullHealthProvider).name).toBe('none');
  });

  it('le provider inerte renvoie une journée vide et refuse les permissions', async () => {
    expect(await nullHealthProvider.isAvailable()).toBe(false);
    expect(await nullHealthProvider.requestPermissions()).toBe(false);
    expect(await nullHealthProvider.getDailySummary('2026-07-07')).toEqual({
      date: '2026-07-07',
      steps: 0,
      activeCalories: 0,
    });
  });
});
