import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
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
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const theme = useTheme();
  
  const backgroundColor = type === 'success' 
    ? (theme.success || '#10b981')
    : (theme.error || '#ef4444');

  useEffect(() => {
    if (visible) {
      // Mostrar toast
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Ocultar toast después de la duración
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onHide();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, translateY, opacity, onHide]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor,
        },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
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

