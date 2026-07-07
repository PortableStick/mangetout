import * as SecureStore from 'expo-secure-store';

/**
 * Stockage sécurisé de la session (jeton + enregistrement utilisateur) dans
 * expo-secure-store (Keystore Android), et NON dans AsyncStorage.
 *
 * expo-secure-store recommande < 2048 octets par valeur ; le payload d'auth
 * PocketBase (JWT + record JSON) peut dépasser → on découpe en fragments.
 */

// Marge sous la limite ~2048 OCTETS d'expo-secure-store (la limite est en octets,
// pas en unités UTF-16 : un caractère accentué/emoji pèse 2 à 4 octets).
const CHUNK_BYTES = 1800;
// Borne de balayage défensif au logout (couvre un token corrompu sans compteur fiable).
const CLEAR_SWEEP_MIN = 16;

function chunkKey(base: string, index: number): string {
  return `${base}.${index}`;
}
function countKey(base: string): string {
  return `${base}.count`;
}

/** Longueur UTF-8 (octets) d'un point de code. */
function utf8Len(codePoint: number): number {
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
}

/** Découpe une chaîne en fragments dont la taille en OCTETS UTF-8 reste ≤ maxBytes. */
export function splitChunks(value: string, maxBytes = CHUNK_BYTES): string[] {
  if (value.length === 0) return [''];
  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;
  // for..of itère par point de code (paires de substitution regroupées).
  for (const ch of value) {
    const bytes = utf8Len(ch.codePointAt(0) ?? 0);
    if (currentBytes + bytes > maxBytes && current !== '') {
      chunks.push(current);
      current = '';
      currentBytes = 0;
    }
    current += ch;
    currentBytes += bytes;
  }
  chunks.push(current);
  return chunks;
}

export async function saveSecure(base: string, value: string): Promise<void> {
  const previous = await readCount(base);
  const chunks = splitChunks(value);

  for (let i = 0; i < chunks.length; i++) {
    await SecureStore.setItemAsync(chunkKey(base, i), chunks[i] ?? '');
  }
  // Supprime les fragments devenus obsolètes (payload plus court qu'avant).
  for (let i = chunks.length; i < previous; i++) {
    await SecureStore.deleteItemAsync(chunkKey(base, i));
  }
  await SecureStore.setItemAsync(countKey(base), String(chunks.length));
}

export async function loadSecure(base: string): Promise<string | null> {
  const count = await readCount(base);
  if (count === 0) return null;
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(chunkKey(base, i));
    if (part == null) return null; // fragment manquant → payload corrompu
    parts.push(part);
  }
  return parts.join('');
}

export async function clearSecure(base: string): Promise<void> {
  const count = await readCount(base);
  // Balaie au-delà du compteur : si `.count` est corrompu (readCount → 0),
  // des fragments de token resteraient sinon orphelins dans le Keystore.
  const upper = Math.max(count, CLEAR_SWEEP_MIN);
  for (let i = 0; i < upper; i++) {
    await SecureStore.deleteItemAsync(chunkKey(base, i));
  }
  await SecureStore.deleteItemAsync(countKey(base));
}

async function readCount(base: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(countKey(base));
  const n = raw == null ? 0 : Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
