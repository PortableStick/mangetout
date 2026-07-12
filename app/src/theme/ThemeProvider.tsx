import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { loadThemeMode, saveThemeMode, type ThemeMode } from './themeMode';
import {
  palettes,
  radius,
  shadow,
  spacing,
  typography,
  type ColorScheme,
  type Palette,
} from './tokens';

export type { ThemeMode } from './themeMode';

export interface Theme {
  scheme: ColorScheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadow: (level: 'sm' | 'md' | 'lg') => ReturnType<typeof shadow>;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let cancelled = false;
    void loadThemeMode().then((stored) => {
      if (!cancelled) setModeState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const scheme: ColorScheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    void saveThemeMode(m);
  };

  const theme = useMemo<Theme>(
    () => ({
      scheme,
      mode,
      setMode,
      colors: palettes[scheme],
      spacing,
      radius,
      typography,
      shadow: (level) => shadow(scheme, level),
    }),
    [scheme, mode]
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme doit être utilisé à l’intérieur de <ThemeProvider>.');
  }
  return theme;
}
