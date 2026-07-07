import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockAuthWithPassword = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockAuthWithOAuth2 = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockClear = jest.fn();

jest.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: () => ({ authWithPassword: mockAuthWithPassword, authWithOAuth2: mockAuthWithOAuth2 }),
    authStore: { clear: (...a: unknown[]) => mockClear(...a) },
  },
  authReady: Promise.resolve(),
}));

const mockOpenAuthSession = jest.fn(async () => ({ type: 'success' }));
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: (...a: unknown[]) => mockOpenAuthSession(...(a as [])),
  dismissAuthSession: jest.fn(),
}));
jest.mock('expo-linking', () => ({ createURL: () => 'mangetout://auth-callback' }));

import { signInWithOidc, signInWithPassword, signOut } from './auth';

describe('auth', () => {
  beforeEach(() => {
    mockAuthWithPassword.mockReset();
    mockAuthWithOAuth2.mockReset();
    mockOpenAuthSession.mockClear();
  });

  it('signInWithPassword mappe l’utilisateur en cas de succès', async () => {
    mockAuthWithPassword.mockResolvedValue({
      record: { id: 'u1', email: 'a@b.fr', name: 'Léa', verified: true },
    });
    const res = await signInWithPassword('  a@b.fr ', 'secret');
    expect(res).toEqual({ ok: true, user: { id: 'u1', email: 'a@b.fr', name: 'Léa', verified: true } });
    expect(mockAuthWithPassword).toHaveBeenCalledWith('a@b.fr', 'secret'); // e-mail trimmé
  });

  it('signInWithPassword renvoie un message d’erreur normalisé', async () => {
    mockAuthWithPassword.mockRejectedValue({ response: { message: 'Identifiants invalides.' } });
    const res = await signInWithPassword('a@b.fr', 'x');
    expect(res).toEqual({ ok: false, error: 'Identifiants invalides.' });
  });

  it('signInWithOidc utilise le provider et ouvre le navigateur via urlCallback', async () => {
    mockAuthWithOAuth2.mockImplementation(async (opts: unknown) => {
      const o = opts as { provider: string; urlCallback: (u: string) => void };
      expect(o.provider).toBe('oidc');
      o.urlCallback('https://auth.example.com/authorize?x=1');
      return { record: { id: 'u2', email: 'c@d.fr' } };
    });
    const res = await signInWithOidc();
    expect(res.ok).toBe(true);
    expect(mockOpenAuthSession).toHaveBeenCalledWith(
      'https://auth.example.com/authorize?x=1',
      'mangetout://auth-callback'
    );
  });

  it('signInWithOidc renvoie une annulation si le navigateur est fermé', async () => {
    mockOpenAuthSession.mockResolvedValueOnce({ type: 'cancel' } as never);
    mockAuthWithOAuth2.mockImplementation((opts: unknown) => {
      const o = opts as { urlCallback: (u: string) => void };
      o.urlCallback('https://auth.example.com/authorize');
      return new Promise(() => {}); // attente temps réel : ne se résout jamais
    });
    const res = await signInWithOidc();
    expect(res).toEqual({ ok: false, error: 'Connexion annulée.' });
  });

  it('signOut vide le store PocketBase', () => {
    signOut();
    expect(mockClear).toHaveBeenCalled();
  });
});
