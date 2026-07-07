import { Platform } from 'react-native';

import { healthConnectProvider } from './healthConnectProvider';
import { nullHealthProvider } from './nullProvider';
import type { HealthProvider } from './types';

/** Choix du provider selon l'OS (pur, testable). Android → Health Connect. */
export function pickProvider(
  os: string,
  android: HealthProvider,
  fallback: HealthProvider
): HealthProvider {
  return os === 'android' ? android : fallback;
}

export function getHealthProvider(): HealthProvider {
  return pickProvider(Platform.OS, healthConnectProvider, nullHealthProvider);
}
