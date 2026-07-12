import * as SecureStore from 'expo-secure-store';

/**
 * Mode de thème choisi par l'utilisateur, persisté dans expo-secure-store
 * (Keystore Android). `'system'` suit le thème du système d'exploitation.
 */
export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme_mode';

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** Lit le mode de thème persisté. Défaut `'system'` si absent, invalide ou en cas d'erreur de lecture. */
export async function loadThemeMode(): Promise<ThemeMode> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    return isThemeMode(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
}

/** Persiste le mode de thème. Échec silencieux en cas d'erreur d'écriture (jamais de throw). */
export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, mode);
  } catch {
    // Échec silencieux : le thème reste appliqué en mémoire pour la session en cours.
  }
}
