export type ThemeMode = 'light' | 'dark' | 'system';

export type AppTheme = {
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
  loadingBg: string;
  loadingText: string;
};

export const lightTheme: AppTheme = {
  screenBg: '#eef4f8',
  glowTop: '#d6f1ec',
  glowBottom: '#dbeafe',
  buttonPrimary: '#0f766e',
  buttonSecondaryBg: '#ffffff',
  buttonSecondaryBorder: '#dbe4ee',
  buttonSecondaryText: '#0f172a',
  inputBg: '#ffffff',
  inputBorder: '#d5dee8',
  inputText: '#0f172a',
  inputLabel: '#0f172a',
  loadingBg: '#eef4f8',
  loadingText: '#0f172a',
};

// Modo oscuro seguro para prototipo: evita contraste roto en pantallas con texto fijo.
export const darkTheme: AppTheme = {
  screenBg: '#e5edf3',
  glowTop: '#c7e5dd',
  glowBottom: '#cad8ee',
  buttonPrimary: '#0d5f59',
  buttonSecondaryBg: '#f3f7fb',
  buttonSecondaryBorder: '#c8d5e2',
  buttonSecondaryText: '#0f172a',
  inputBg: '#f8fbff',
  inputBorder: '#cbd7e3',
  inputText: '#0f172a',
  inputLabel: '#0f172a',
  loadingBg: '#e5edf3',
  loadingText: '#0f172a',
};