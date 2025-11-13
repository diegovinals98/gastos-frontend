import { useColorScheme } from 'react-native';

export const lightTheme = {
  background: '#f9fafb',
  card: '#ffffff',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  button: '#f3f4f6',
  skeleton: '#f3f4f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  shadow: '#000',
};

export const darkTheme = {
  background: '#111827',
  card: '#1f2937',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  border: '#374151',
  button: '#374151',
  skeleton: '#374151',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  shadow: '#000',
};

export const useTheme = () => {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkTheme : lightTheme;
};

