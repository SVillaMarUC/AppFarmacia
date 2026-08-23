export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

export type ThemeColors = {
  // Fondos y superficies
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string;

  // Tipografía
  text: string;
  textSecondary: string;
  textMuted: string;

  // Bordes y separadores
  border: string;
  borderLight: string;

  // Marca / Primario
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryForeground: string;

  // Estados semánticos
  success: string;
  successBg: string;
  successText: string;
  warning: string;
  warningBg: string;
  warningText: string;
  error: string;
  errorBg: string;
  errorText: string;
  info: string;
  infoBg: string;
  infoText: string;

  // Navegación (Tabs y Header)
  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  headerBg: string;
  headerText: string;

  // Formularios e inputs
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputLabel: string;
  inputPlaceholder: string;

  // Botones
  buttonPrimary: string;
  buttonSecondaryBg: string;
  buttonSecondaryBorder: string;
  buttonSecondaryText: string;

  // Efectos visuales de fondo (halos)
  glowTop: string;
  glowBottom: string;

  // Overlay y carga
  loadingBg: string;
  loadingText: string;
};

export type AppTheme = {
  colors: ThemeColors;
  // Propiedades directas para compatibilidad hacia atrás
  screenBg: string;
  glowTop: string;
  glowBottom: string;
  buttonPrimary: string;
  buttonSecondaryBg: string;
  buttonSecondaryBorder: string;
  buttonSecondaryText: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputLabel: string;
  inputPlaceholder: string;
  loadingBg: string;
  loadingText: string;
};

const lightColors: ThemeColors = {
  background: '#f1f5f9',
  surface: '#ffffff',
  surfaceSecondary: '#f8fafc',
  surfaceElevated: '#ffffff',

  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',

  border: '#dbe4ee',
  borderLight: '#edf2f7',

  primary: '#0f766e',
  primaryLight: '#e6f7f5',
  primaryDark: '#0d5f59',
  primaryForeground: '#ffffff',

  success: '#16a34a',
  successBg: '#dcfce7',
  successText: '#15803d',
  warning: '#d97706',
  warningBg: '#fef3c7',
  warningText: '#92400e',
  error: '#dc2626',
  errorBg: '#fee2e2',
  errorText: '#b91c1c',
  info: '#0284c7',
  infoBg: '#e0f2fe',
  infoText: '#0369a1',

  tabBarBg: '#ffffff',
  tabBarBorder: '#dbe4ee',
  tabBarActive: '#0f766e',
  tabBarInactive: '#64748b',
  headerBg: '#0f766e',
  headerText: '#ffffff',

  inputBg: '#ffffff',
  inputBorder: '#d5dee8',
  inputText: '#0f172a',
  inputLabel: '#0f172a',
  inputPlaceholder: '#94a3b8',

  buttonPrimary: '#0f766e',
  buttonSecondaryBg: '#ffffff',
  buttonSecondaryBorder: '#dbe4ee',
  buttonSecondaryText: '#0f172a',

  glowTop: '#d6f1ec',
  glowBottom: '#dbeafe',

  loadingBg: '#eef4f8',
  loadingText: '#0f172a',
};

const darkColors: ThemeColors = {
  background: '#0b1120',
  surface: '#151f32',
  surfaceSecondary: '#1e2b42',
  surfaceElevated: '#1a263d',

  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  border: '#27364f',
  borderLight: '#1e2b42',

  primary: '#14b8a6',
  primaryLight: '#0d3d38',
  primaryDark: '#0f766e',
  primaryForeground: '#ffffff',

  success: '#22c55e',
  successBg: '#052e16',
  successText: '#4ade80',
  warning: '#fbbf24',
  warningBg: '#451a03',
  warningText: '#fcd34d',
  error: '#f87171',
  errorBg: '#450a0a',
  errorText: '#fca5a5',
  info: '#38bdf8',
  infoBg: '#082f49',
  infoText: '#7dd3fc',

  tabBarBg: '#111928',
  tabBarBorder: '#1f2d42',
  tabBarActive: '#2dd4bf',
  tabBarInactive: '#8595a8',
  headerBg: '#0d2528',
  headerText: '#f8fafc',

  inputBg: '#151f32',
  inputBorder: '#27364f',
  inputText: '#f8fafc',
  inputLabel: '#e2e8f0',
  inputPlaceholder: '#64748b',

  buttonPrimary: '#0f766e',
  buttonSecondaryBg: '#151f32',
  buttonSecondaryBorder: '#27364f',
  buttonSecondaryText: '#f8fafc',

  glowTop: '#0d403c',
  glowBottom: '#132845',

  loadingBg: '#0b1120',
  loadingText: '#f8fafc',
};

export const lightTheme: AppTheme = {
  colors: lightColors,
  screenBg: lightColors.background,
  glowTop: lightColors.glowTop,
  glowBottom: lightColors.glowBottom,
  buttonPrimary: lightColors.buttonPrimary,
  buttonSecondaryBg: lightColors.buttonSecondaryBg,
  buttonSecondaryBorder: lightColors.buttonSecondaryBorder,
  buttonSecondaryText: lightColors.buttonSecondaryText,
  inputBg: lightColors.inputBg,
  inputBorder: lightColors.inputBorder,
  inputText: lightColors.inputText,
  inputLabel: lightColors.inputLabel,
  inputPlaceholder: lightColors.inputPlaceholder,
  loadingBg: lightColors.loadingBg,
  loadingText: lightColors.loadingText,
};

export const darkTheme: AppTheme = {
  colors: darkColors,
  screenBg: darkColors.background,
  glowTop: darkColors.glowTop,
  glowBottom: darkColors.glowBottom,
  buttonPrimary: darkColors.buttonPrimary,
  buttonSecondaryBg: darkColors.buttonSecondaryBg,
  buttonSecondaryBorder: darkColors.buttonSecondaryBorder,
  buttonSecondaryText: darkColors.buttonSecondaryText,
  inputBg: darkColors.inputBg,
  inputBorder: darkColors.inputBorder,
  inputText: darkColors.inputText,
  inputLabel: darkColors.inputLabel,
  inputPlaceholder: darkColors.inputPlaceholder,
  loadingBg: darkColors.loadingBg,
  loadingText: darkColors.loadingText,
};