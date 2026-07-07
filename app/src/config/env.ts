/**
 * Configuration lue depuis les variables EXPO_PUBLIC_* (embarquées, NON secrètes).
 * Aucun secret ici : la clé IA vit uniquement côté serveur (proxy).
 */

export type AuthMode = 'oidc' | 'password';

function str(value: string | undefined, fallback: string): string {
  return value && value.length > 0 ? value : fallback;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  return value === 'true' || value === '1';
}

export const env = {
  /** URL publique de PocketBase (derrière Traefik). */
  pbUrl: str(process.env.EXPO_PUBLIC_PB_URL, 'https://pb.example.com'),
  /** URL du proxy IA (sidecar). */
  aiUrl: str(process.env.EXPO_PUBLIC_AI_URL, 'https://ai.example.com'),
  /** Mode d'auth : oidc (Authelia) ou password (fallback natif PocketBase). */
  authMode: str(process.env.EXPO_PUBLIC_AUTH_MODE, 'oidc') as AuthMode,
  /** Nom du provider OIDC générique configuré côté PocketBase (à valider au setup). */
  oidcProvider: str(process.env.EXPO_PUBLIC_OIDC_PROVIDER, 'oidc'),
  /** Feature flag IA global. */
  aiEnabled: bool(process.env.EXPO_PUBLIC_AI_ENABLED, true),
} as const;

export type Env = typeof env;
