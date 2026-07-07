import { config } from './config.ts';

/**
 * Vérifie le jeton PocketBase (envoyé par l'app) et renvoie l'id utilisateur.
 * Le proxy n'exécute jamais rien sans utilisateur authentifié (owner-scoping).
 */
export async function verifyUser(
  token: string | undefined,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  if (!token) return null;
  try {
    const res = await fetchImpl(`${config.pbInternalUrl}/api/collections/users/auth-refresh`, {
      method: 'POST',
      headers: { Authorization: token },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { record?: { id?: string } };
    return data.record?.id ?? null;
  } catch {
    return null;
  }
}
