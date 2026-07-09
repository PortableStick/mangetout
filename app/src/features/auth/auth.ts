import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { env } from '@/config/env';
import { pb } from '@/lib/pocketbase';

const USERS = 'users';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  verified?: boolean;
}

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; error: string };

/** Normalise l'erreur PocketBase en message FR affichable. */
function toMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const anyErr = error as { message?: string; response?: { message?: string } };
    return anyErr.response?.message || anyErr.message || 'Erreur d’authentification.';
  }
  return 'Erreur d’authentification.';
}

function toUser(record: Record<string, unknown> | null): AuthUser {
  return {
    id: String(record?.id ?? ''),
    email: String(record?.email ?? ''),
    name: record?.name ? String(record.name) : undefined,
    verified: Boolean(record?.verified),
  };
}

/**
 * Login OIDC : délègue à Authelia via le flow OAuth2 tout-en-un de PocketBase.
 * PocketBase génère l'URL, on l'ouvre dans le navigateur système (expo-web-browser) ;
 * PocketBase récupère le code via son canal temps réel et résout la promesse.
 * ⚠️ Nom exact du provider (`EXPO_PUBLIC_OIDC_PROVIDER`) à valider côté PocketBase.
 */
const CANCELED = '__canceled__';

export async function signInWithOidc(): Promise<AuthResult> {
  // Tout est dans le try : `Linking.createURL`, la construction de la promesse
  // d'auth (le SDK peut lever de façon synchrone) et l'attente. Sinon une
  // exception hors try remonterait en crash/red box au lieu d'un message affiché.
  try {
    const redirectUrl = Linking.createURL('auth-callback');

    // Le SDK attend le retour via son canal temps réel et ne rejette PAS si
    // l'utilisateur ferme le navigateur → on court-circuite avec une promesse
    // d'annulation déclenchée quand openAuthSessionAsync renvoie cancel/dismiss.
    let onCancel: ((reason: Error) => void) | null = null;
    const canceledPromise = new Promise<never>((_, reject) => {
      onCancel = reject;
    });

    const authPromise = pb.collection(USERS).authWithOAuth2({
      provider: env.oidcProvider,
      urlCallback: (url) => {
        void WebBrowser.openAuthSessionAsync(url, redirectUrl).then((result) => {
          if (result.type === 'cancel' || result.type === 'dismiss') {
            onCancel?.(new Error(CANCELED));
          }
        });
      },
    });

    const res = await Promise.race([authPromise, canceledPromise]);
    return { ok: true, user: toUser(res.record as Record<string, unknown>) };
  } catch (error) {
    if (error instanceof Error && error.message === CANCELED) {
      return { ok: false, error: 'Connexion annulée.' };
    }
    return { ok: false, error: toMessage(error) };
  } finally {
    void WebBrowser.dismissAuthSession();
  }
}

/** Fallback email/mot de passe natif PocketBase (AUTH_MODE=password). */
export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  try {
    const res = await pb.collection(USERS).authWithPassword(email.trim(), password);
    return { ok: true, user: toUser(res.record as Record<string, unknown>) };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export function signOut(): void {
  pb.authStore.clear();
}

export function currentUser(): AuthUser | null {
  return pb.authStore.record ? toUser(pb.authStore.record as Record<string, unknown>) : null;
}

export function isAuthenticated(): boolean {
  return pb.authStore.isValid;
}
