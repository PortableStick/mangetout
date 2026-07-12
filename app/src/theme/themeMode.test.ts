import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockMem = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockMem.set(k, v);
  }),
  getItemAsync: jest.fn(async (k: string) => (mockMem.has(k) ? mockMem.get(k)! : null)),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockMem.delete(k);
  }),
}));

import * as SecureStore from 'expo-secure-store';

import { loadThemeMode, saveThemeMode } from './themeMode';

describe('themeMode', () => {
  beforeEach(() => mockMem.clear());

  it('défaut système si absent', async () => {
    expect(await loadThemeMode()).toBe('system');
  });

  it('round-trip dark', async () => {
    await saveThemeMode('dark');
    expect(await loadThemeMode()).toBe('dark');
  });

  it('valeur invalide → système', async () => {
    await SecureStore.setItemAsync('theme_mode', 'bogus');
    expect(await loadThemeMode()).toBe('system');
  });

  it('erreur de lecture → système (pas de throw)', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementationOnce(async () => {
      throw new Error('boom');
    });
    await expect(loadThemeMode()).resolves.toBe('system');
  });

  it('erreur d’écriture → pas de throw', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockImplementationOnce(async () => {
      throw new Error('boom');
    });
    await expect(saveThemeMode('light')).resolves.toBeUndefined();
  });
});
