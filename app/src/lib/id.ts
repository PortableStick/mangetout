const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Identifiant client (15 caractères alphanumériques), compatible avec les ids
 * PocketBase. Généré côté client pour que l'id soit stable dès la création
 * offline (pas de remapping à la synchronisation).
 */
export function newId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.getRandomValues) {
    const bytes = c.getRandomValues(new Uint8Array(15));
    let out = '';
    for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
    return out;
  }
  // Repli (environnements sans WebCrypto).
  let out = '';
  for (let i = 0; i < 15; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}
