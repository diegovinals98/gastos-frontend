import React from 'react';
import {
  View,
  StyleSheet,
  Platform,
  useColorScheme,
  type ViewProps,
} from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';

/**
 * Superficie con efecto "Liquid Glass".
 *
 * Estrategia híbrida y degradación elegante:
 *  1. iOS 26+  -> GlassView (Liquid Glass nativo real, con refracción/brillo)
 *  2. iOS < 26 / Android -> BlurView (frosted glass clásico)
 *  3. Sin soporte -> View sólido con `fallbackColor`
 *
 * Pensado para reutilizarse en tab bar, headers, tarjetas, toasts, etc.
 */

// `isLiquidGlassAvailable()` solo comprueba disponibilidad del componente;
// es estable durante la vida de la app, así que lo evaluamos una vez.
const LIQUID_GLASS = isLiquidGlassAvailable();

export type GlassSurfaceProps = ViewProps & {
  /** Estilo del cristal nativo. 'regular' = más opaco, 'clear' = más transparente. */
  glassStyle?: 'regular' | 'clear';
  /** Tinte opcional del cristal (rgba recomendado para no perder transparencia). */
  tintColor?: string;
  /** Si el cristal nativo reacciona al toque (brillo interactivo). */
  isInteractive?: boolean;
  /** Intensidad del blur en el fallback de Android / iOS antiguo (0-100). */
  blurIntensity?: number;
  /** Color sólido cuando no hay ni glass ni blur disponibles. */
  fallbackColor?: string;
  children?: React.ReactNode;
};

export const isGlassSupported = LIQUID_GLASS;

export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  glassStyle = 'regular',
  tintColor,
  isInteractive = false,
  blurIntensity = 40,
  fallbackColor,
  style,
  children,
  ...rest
}) => {
  const scheme = useColorScheme();

  // 1) Liquid Glass nativo (iOS 26+)
  if (LIQUID_GLASS) {
    return (
      <GlassView
        glassEffectStyle={glassStyle}
        tintColor={tintColor}
        isInteractive={isInteractive}
        style={style}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }

  // 2) Blur clásico (iOS < 26 y Android)
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return (
      <BlurView
        intensity={blurIntensity}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        style={style}
        {...rest}
      >
        {children}
      </BlurView>
    );
  }

  // 3) Sólido (web / sin soporte)
  return (
    <View
      style={[
        fallbackColor ? { backgroundColor: fallbackColor } : undefined,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

export default GlassSurface;

// Evita warning de StyleSheet sin uso si se importa en árboles tree-shaken.
export const glassSurfaceStyles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
});
