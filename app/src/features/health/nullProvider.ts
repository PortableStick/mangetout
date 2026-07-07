import { emptyDay, type HealthProvider } from './types';

/** Provider inerte : plateformes sans intégration santé (web, iOS tant que HealthKit différé). */
export const nullHealthProvider: HealthProvider = {
  name: 'none',
  async isAvailable() {
    return false;
  },
  async requestPermissions() {
    return false;
  },
  async getDailySummary(date: string) {
    return emptyDay(date);
  },
};
