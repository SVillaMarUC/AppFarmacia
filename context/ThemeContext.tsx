import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type AppTheme, type ThemeMode } from '@/constants/theme';

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  theme: AppTheme;
  cycleMode: () => Promise<void>;
};

const STORAGE_KEY = 'farmaya_theme_mode';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    let cancelled = false;

    const loadMode = async () => {
      try {
        const saved = await SecureStore.getItemAsync(STORAGE_KEY);
        if (!cancelled && (saved === 'light' || saved === 'dark' || saved === 'system')) {
          setMode(saved);
        }
      } catch {
        // Si SecureStore falla, se mantiene modo sistema.
      }
    };

    void loadMode();

    return () => {
      cancelled = true;
    };
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const theme = isDark ? darkTheme : lightTheme;

  const cycleMode = async () => {
    const nextMode: ThemeMode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    setMode(nextMode);
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, nextMode);
    } catch {
      // No bloquear UI por persistencia.
    }
  };

  const value = useMemo(
    () => ({
      mode,
      isDark,
      theme,
      cycleMode,
    }),
    [mode, isDark, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider.');
  }
  return context;
};