import { useColorScheme } from 'react-native';

// Paleta coherente estilo iOS. Se conservan `background`/`card` con sus hex
// originales porque algunos componentes detectan el modo oscuro comparando
// contra '#111827'. Se añaden tokens nuevos (primary, separator, inputBg…).
export const lightTheme = {
  background: '#f9fafb',
  card: '#ffffff',
  cardElevated: '#ffffff',
  text: '#1f2937',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  border: '#e5e7eb',
  separator: 'rgba(60,60,67,0.12)',
  button: '#f3f4f6',
  inputBg: '#f3f4f6',
  skeleton: '#eef0f3',
  // Acento principal = azul del sistema iOS
  primary: '#007AFF',
  primarySoft: 'rgba(0,122,255,0.12)',
  onPrimary: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  overlay: 'rgba(0,0,0,0.4)',
  shadow: '#000',
};

export const darkTheme = {
  background: '#111827',
  card: '#1f2937',
  cardElevated: '#232f3e',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  textTertiary: '#6b7280',
  border: '#374151',
  separator: 'rgba(84,84,88,0.4)',
  button: '#374151',
  inputBg: '#0f1623',
  skeleton: '#263244',
  primary: '#0A84FF',
  primarySoft: 'rgba(10,132,255,0.18)',
  onPrimary: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  overlay: 'rgba(0,0,0,0.5)',
  shadow: '#000',
};

export type AppTheme = typeof lightTheme;

export const useTheme = (): AppTheme => {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkTheme : lightTheme;
};
