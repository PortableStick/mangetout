import PocketBase, { AsyncAuthStore } from 'pocketbase';

import { env } from '@/config/env';
import { clearSecure, loadSecure, saveSecure } from '@/features/auth/secureStore';

const AUTH_STORE_KEY = 'pb_auth';

/**
 * Store d'auth persistant chiffré (Keystore Android via expo-secure-store).
 * `initial` charge la session au démarrage ; `save`/`clear` la persistent.
 */
const initialPromise = loadSecure(AUTH_STORE_KEY).then((v) => v ?? undefined);

const authStore = new AsyncAuthStore({
  save: async (serialized) => saveSecure(AUTH_STORE_KEY, serialized),
  clear: async () => clearSecure(AUTH_STORE_KEY),
  initial: initialPromise,
});

/** Résolu quand la session persistée a fini d'être chargée dans le store. */
export const authReady: Promise<void> = initialPromise.then(() => undefined);

/** Client PocketBase unique (homelab = source de vérité autoritaire). */
export const pb = new PocketBase(env.pbUrl, authStore);

// Désactive l'auto-annulation : plusieurs requêtes concurrentes (sync) coexistent.
pb.autoCancellation(false);
