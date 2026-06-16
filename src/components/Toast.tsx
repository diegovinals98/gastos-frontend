import React, { useEffect, useRef, useCallback } from 'react';
import { Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../config/theme';
import { GlassSurface } from './GlassSurface';

const { width } = Dimensions.get('window');

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
  type?: 'success' | 'error';
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  visible, 
  onHide, 
  duration = 3000,
  type = 'error'
}) => {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme.background === '#111827';
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const SWIPE_THRESHOLD = -50; // 50px hacia arriba para cerrar

  // El color semántico va solo en el icono. El cristal lleva un tinte
  // NEUTRO con más cuerpo (como el material de las notificaciones de iOS),
  // para que tenga fondo y el texto se lea bien sobre cualquier contenido.
  const accentColor = type === 'success'
    ? (theme.success || '#10b981')
    : (theme.error || '#ef4444');
  const tintColor = isDark
    ? 'rgba(38, 38, 42, 0.78)'
    : 'rgba(255, 255, 255, 0.78)';
  // Borde hairline para definir el panel de cristal sobre cualquier fondo.
  const borderColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)';
  const iconName = type === 'success' ? 'checkmark-circle' : 'alert-circle';

  const cancelTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    translateY.value = withTiming(-100, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 });
    // Llamar onHide después de un pequeño delay para que la animación termine
    setTimeout(() => {
      onHide();
    }, 300);
  }, [onHide]);

  const handleSwipeToDismiss = useCallback(() => {
    cancelTimer();
    hideToast();
  }, [cancelTimer, hideToast]);

  useEffect(() => {
    if (visible) {
      // Mostrar toast
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });

      // Ocultar toast después de la duración
      timerRef.current = setTimeout(() => {
        if (timerRef.current) {
          hideToast();
        }
      }, duration);

      return () => {
        cancelTimer();
      };
    } else {
      // Resetear posición cuando no es visible
      translateY.value = -100;
      opacity.value = 0;
      cancelTimer();
    }
  }, [visible, duration]);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10]) // Activar solo con movimiento vertical
    .failOffsetX([-50, 50]) // Fallar si hay mucho movimiento horizontal
    .onStart(() => {
      // Cancelar timer cuando el usuario empieza a deslizar
      runOnJS(cancelTimer)();
    })
    .onUpdate((e) => {
      // Solo permitir deslizamiento hacia arriba (translationY negativo)
      if (e.translationY < 0) {
        translateY.value = e.translationY;
        // Reducir opacidad mientras se desliza (más suave)
        opacity.value = Math.max(0.3, 1 + e.translationY / 150);
      }
    })
    .onEnd((e) => {
      if (e.translationY < SWIPE_THRESHOLD) {
        // Deslizó suficiente hacia arriba, cerrar toast
        runOnJS(handleSwipeToDismiss)();
      } else {
        // No deslizó suficiente, volver a posición original
        translateY.value = withTiming(0, { duration: 200 });
        opacity.value = withTiming(1, { duration: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  if (!visible) return null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.wrapper, { top: insets.top + 8 }, animatedStyle]}>
        <GlassSurface
          glassStyle="regular"
          tintColor={tintColor}
          fallbackColor={isDark ? theme.card : '#ffffff'}
          style={[styles.glass, { borderColor }]}
        >
          <Ionicons name={iconName} size={22} color={accentColor} />
          <Text style={[styles.text, { color: theme.text }]} numberOfLines={3}>
            {message}
          </Text>
        </GlassSurface>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 22,
    // Sombra suave para que la notificación "flote" sobre el contenido.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
    zIndex: 9999,
  },
  glass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  text: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
});

// Hook para usar el toast
let toastRef: { show: (message: string, duration?: number) => void } | null = null;

export const setToastRef = (ref: typeof toastRef) => {
  toastRef = ref;
};

export const showToast = (message: string, duration?: number) => {
  if (toastRef) {
    toastRef.show(message, duration);
  }
};

