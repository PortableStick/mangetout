import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

// Migrations générées par `npm run db:generate` (drizzle-kit, driver expo).
// Le fichier bundle les `.sql` en JS pour être embarqué dans l'APK.
import migrations from '../../drizzle/migrations';

import { db } from './client';

/**
 * Applique les migrations SQLite locales au démarrage (idempotent : drizzle
 * saute celles déjà appliquées). DOIT résoudre avant tout accès à la base
 * (sync, écrans) sinon `no such table` → crash.
 */
export function useDbMigrations(): { success: boolean; error?: Error } {
  return useMigrations(db, migrations);
}
