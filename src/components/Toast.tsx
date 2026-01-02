import React, { useEffect, useRef, useCallback } from 'react';
import { Text, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../config/theme';

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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const SWIPE_THRESHOLD = -50; // 50px hacia arriba para cerrar
  
  const backgroundColor = type === 'success' 
    ? (theme.success || '#10b981')
    : (theme.error || '#ef4444');

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
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor,
          },
          animatedStyle,
        ]}
      >
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 9999,
  },
  text: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
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

