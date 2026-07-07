import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

/** Base SQLite locale (cache offline). enableChangeListener → réactivité live queries. */
export const sqlite = openDatabaseSync('mangetout.db', { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });

export type Database = typeof db;
