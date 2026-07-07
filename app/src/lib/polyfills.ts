import EventSource from 'react-native-sse';

/**
 * PocketBase utilise l'API temps réel (SSE) via `EventSource` — notamment dans
 * le flow OAuth2 « tout-en-un » (`authWithOAuth2`). Or `EventSource` n'existe pas
 * dans React Native/Hermes → sans ce polyfill, le login OIDC crashe.
 * À importer AVANT toute utilisation du client PocketBase.
 */
const g = globalThis as { EventSource?: unknown };
if (typeof g.EventSource === 'undefined') {
  g.EventSource = EventSource as unknown;
}
