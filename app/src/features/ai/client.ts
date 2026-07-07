import { env } from '@/config/env';
import { pb } from '@/lib/pocketbase';

/**
 * Appelle le proxy IA (jamais OpenRouter en direct : la clé vit côté serveur).
 * Le jeton PocketBase authentifie l'utilisateur (owner-scoping + rate-limit serveur).
 */
export async function aiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${env.aiUrl}/api/ai/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(detail.error ?? `Erreur IA (${res.status})`);
  }
  return (await res.json()) as T;
}
