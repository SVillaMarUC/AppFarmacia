import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';
import { safeStorage } from '@/services/storage/safeStorage';
import { darkTheme, lightTheme, type AppTheme, type EffectiveTheme, type ThemeMode } from '@/constants/theme';

type ThemeContextValue = {
  mode: ThemeMode;
  effectiveTheme: EffectiveTheme;
  isDark: boolean;
  theme: AppTheme;
  setMode: (mode: ThemeMode) => Promise<void>;
  cycleMode: () => Promise<void>;
};

const STORAGE_KEY = 'farmaya_theme_mode';

const ThemeContext = createContext<ThemeContextValue | null>(null);

const saveStoredMode = async (mode: ThemeMode) => {
  try {
    await safeStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignorar error de persistencia
  }
};

const getStoredMode = async (): Promise<ThemeMode | null> => {
  try {
    const saved = await safeStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // Ignorar error
  }

  return null;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemSchemeHook = useColorScheme();
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    systemSchemeHook ?? Appearance.getColorScheme() ?? 'light'
  );
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Sincronizar esquema del sistema en tiempo real
  useEffect(() => {
    if (systemSchemeHook) {
      setSystemScheme(systemSchemeHook);
    }
  }, [systemSchemeHook]);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? 'light');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Cargar preferencia persistida
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const stored = await getStoredMode();
      if (isMounted && stored) {
        setModeState(stored);
      }
    };

    void init();

    return () => {
      isMounted = false;
    };
  }, []);

  const effectiveTheme: EffectiveTheme = useMemo(() => {
    if (mode === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return mode;
  }, [mode, systemScheme]);

  const isDark = effectiveTheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await saveStoredMode(newMode);
  };

  const cycleMode = async () => {
    const nextMode: ThemeMode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    await setMode(nextMode);
  };

  const value = useMemo(
    () => ({
      mode,
      effectiveTheme,
      isDark,
      theme,
      setMode,
      cycleMode,
    }),
    [mode, effectiveTheme, isDark, theme]
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