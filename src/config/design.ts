import { TextStyle } from 'react-native';

// Sistema de diseño: escalas coherentes de espaciado, radios y tipografía.
// Estilo iOS para una app limpia y profesional.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

// Tipografía tipo iOS (HIG). Pesos como string para RN.
export const typography = {
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: 0.2 } as TextStyle,
  title: { fontSize: 28, fontWeight: '700', letterSpacing: 0.2 } as TextStyle,
  title2: { fontSize: 22, fontWeight: '700' } as TextStyle,
  title3: { fontSize: 20, fontWeight: '600' } as TextStyle,
  headline: { fontSize: 17, fontWeight: '600' } as TextStyle,
  body: { fontSize: 17, fontWeight: '400' } as TextStyle,
  callout: { fontSize: 16, fontWeight: '400' } as TextStyle,
  subhead: { fontSize: 15, fontWeight: '500' } as TextStyle,
  footnote: { fontSize: 13, fontWeight: '400' } as TextStyle,
  caption: { fontSize: 12, fontWeight: '500' } as TextStyle,
} as const;

// Sombra suave reutilizable para tarjetas (sutil, estilo iOS).
export const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
} as const;

// Altura estándar de controles (inputs, botones).
export const controlHeight = 52;
