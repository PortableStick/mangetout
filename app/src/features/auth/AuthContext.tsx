import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authReady, pb } from '@/lib/pocketbase';

import {
  currentUser,
  isAuthenticated as sessionValid,
  signInWithOidc,
  signInWithPassword,
  signOut,
  type AuthResult,
  type AuthUser,
} from './auth';

interface AuthState {
  /** true une fois la session persistée chargée (évite le flash de login). */
  ready: boolean;
  user: AuthUser | null;
  isAuthenticated: boolean;
  signInWithOidc: () => Promise<AuthResult>;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  // Basé sur la validité du JETON (expiration incluse), pas la seule présence du record :
  // une session persistée mais expirée ne doit PAS être considérée connectée.
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const sync = () => {
      setUser(currentUser());
      setAuthed(sessionValid());
    };

    // onChange se déclenche à chaque mutation du store (login, logout, refresh).
    const unsubscribe = pb.authStore.onChange(() => {
      if (mounted) sync();
    }, true);

    void authReady.then(() => {
      if (!mounted) return;
      sync();
      setReady(true);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      user,
      isAuthenticated: authed,
      signInWithOidc,
      signInWithPassword,
      signOut,
    }),
    [ready, user, authed]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>.');
  return ctx;
}
