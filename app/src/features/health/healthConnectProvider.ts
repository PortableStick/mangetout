import {
  aggregateRecord,
  getSdkStatus,
  initialize,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import { emptyDay, type DailyHealth, type HealthProvider } from './types';

function dayRange(date: string) {
  return {
    operator: 'between' as const,
    startTime: `${date}T00:00:00.000Z`,
    endTime: `${date}T23:59:59.999Z`,
  };
}

/**
 * Provider Health Connect (Android). ⚠️ Module natif : ne fonctionne PAS dans
 * Expo Go → nécessite un development build. Toutes les méthodes échouent en
 * douceur (valeurs neutres) si HC est absent ou non autorisé.
 */
export const healthConnectProvider: HealthProvider = {
  name: 'health-connect',

  async isAvailable() {
    try {
      return (await getSdkStatus()) === SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch {
      return false;
    }
  },

  async requestPermissions() {
    try {
      await initialize();
      const granted = await requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      ]);
      return granted.length > 0;
    } catch {
      return false;
    }
  },

  async getDailySummary(date: string): Promise<DailyHealth> {
    try {
      await initialize();
      const timeRangeFilter = dayRange(date);
      const steps = await aggregateRecord({ recordType: 'Steps', timeRangeFilter });
      const calories = await aggregateRecord({
        recordType: 'ActiveCaloriesBurned',
        timeRangeFilter,
      });
      const stepsTotal = (steps as { COUNT_TOTAL?: number }).COUNT_TOTAL ?? 0;
      const kcal =
        (calories as { ACTIVE_CALORIES_TOTAL?: { inKilocalories?: number } }).ACTIVE_CALORIES_TOTAL
          ?.inKilocalories ?? 0;
      return { date, steps: Number(stepsTotal), activeCalories: Math.round(Number(kcal)) };
    } catch {
      return emptyDay(date);
    }
  },
};
