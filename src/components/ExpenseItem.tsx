import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Platform } from 'react-native';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Gasto } from '../types';
import { useTheme } from '../config/theme';

type RootStackParamList = {
  Home: undefined;
  ExpenseDetail: { gasto: Gasto };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'ExpenseDetail'>;

interface ExpenseItemProps {
  gasto: Gasto;
  isHighlighted?: boolean;
}

export const ExpenseItem: React.FC<ExpenseItemProps> = ({ gasto, isHighlighted = false }) => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [showQuickModal, setShowQuickModal] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const date = parseISO(gasto.date);
  const formattedDate = format(date, "d 'de' MMMM, HH:mm", { locale: es });
  const amount = Math.abs(gasto.amount);

  // Valores animados para el efecto 3D Touch
  const scale = useSharedValue(1);
  const elevation = useSharedValue(0);
  const isPressed = useSharedValue(false);

  // Función para activar feedback háptico
  const triggerHaptic = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePress = () => {
    if (!showQuickModal) {
      navigation.navigate('ExpenseDetail', { gasto });
    }
  };

  const handlePressIn = () => {
    isPressed.value = true;
    // Animación de "peek" estilo 3D Touch
    scale.value = withSpring(0.97, {
      damping: 15,
      stiffness: 300,
    });
    elevation.value = withSpring(8, {
      damping: 15,
      stiffness: 300,
    });
    
    // Feedback háptico inmediato
    triggerHaptic();
    
    // Iniciar timer para mostrar modal después de 300ms (similar a 3D Touch)
    longPressTimerRef.current = setTimeout(() => {
      // Segundo feedback háptico más fuerte cuando se activa el peek
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      setShowQuickModal(true);
      // Escalar un poco más cuando se muestra el modal
      scale.value = withSpring(0.95, {
        damping: 20,
        stiffness: 400,
      });
    }, 300);
  };

  const handlePressOut = () => {
    isPressed.value = false;
    // Animación de vuelta a la normalidad
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
    elevation.value = withSpring(0, {
      damping: 15,
      stiffness: 300,
    });
    
    // Limpiar timer si se suelta antes de tiempo
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    // Cerrar modal si está abierto
    if (showQuickModal) {
      setShowQuickModal(false);
    }
  };

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);
  
  // Determinar el estado del gasto
  const status = gasto.status?.toLowerCase() || '';
  const isRejected = gasto.approved === false || status === 'rejected' || status === 'decline';
  const isRefunded = status === 'refund';
  const isReversed = status === 'reverse';
  const isComplete = status === 'complete';
  const isPending = !status || status === 'pending' || (!isRejected && !isRefunded && !isReversed && !isComplete);

  // Detectar si es modo oscuro
  const isDarkMode = theme.background === '#111827';
  
  // Colores y estilos según el estado
  const getStatusStyles = () => {
    if (isRejected) {
      return {
        containerBg: theme.card,
        borderColor: theme.error,
        borderWidth: 2,
        opacity: 0.5,
        badgeBg: theme.error,
        badgeText: 'Rechazado',
        icon: 'close-circle' as const,
        iconColor: theme.error,
        amountColor: theme.textSecondary,
        merchantColor: theme.textSecondary,
      };
    }
    if (isRefunded) {
      return {
        containerBg: theme.card,
        borderColor: '#10b981',
        borderWidth: 2,
        opacity: 1,
        badgeBg: '#10b981',
        badgeText: 'Reembolso',
        icon: 'arrow-back-circle' as const,
        iconColor: '#10b981',
        amountColor: '#10b981',
        merchantColor: theme.text,
      };
    }
    if (isReversed) {
      return {
        containerBg: theme.card,
        borderColor: '#f59e0b',
        borderWidth: 2,
        opacity: 1,
        badgeBg: '#f59e0b',
        badgeText: 'Revertido',
        icon: 'refresh-circle' as const,
        iconColor: '#f59e0b',
        amountColor: theme.textSecondary,
        merchantColor: theme.textSecondary,
      };
    }
    if (isPending) {
      return {
        containerBg: theme.card,
        borderColor: theme.textSecondary,
        borderWidth: 1,
        opacity: 1,
        badgeBg: theme.textSecondary,
        badgeText: 'Retenido',
        icon: 'time-outline' as const,
        iconColor: theme.textSecondary,
        amountColor: theme.error,
        merchantColor: theme.text,
      };
    }
    // Complete o aprobado
    return {
      containerBg: theme.card,
      borderColor: '#10b981',
      borderWidth: 1,
      opacity: 1,
      badgeBg: '#10b981',
      badgeText: 'Aprobado',
      icon: 'checkmark-circle' as const,
      iconColor: '#10b981',
      amountColor: theme.error,
      merchantColor: theme.text,
    };
  };

  const statusStyles = getStatusStyles();

  // Estilo animado para el efecto 3D Touch
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      shadowOpacity: elevation.value > 0 ? 0.25 : 0.1,
      shadowRadius: elevation.value * 1.5,
      shadowOffset: { width: 0, height: elevation.value / 2 },
      elevation: elevation.value,
    };
  });

  return (
    <>
      <Pressable 
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
      <Animated.View style={[
        styles.container,
        styles.containerCompact,
        { 
          backgroundColor: statusStyles.containerBg,
          borderColor: statusStyles.borderColor,
          borderWidth: statusStyles.borderWidth,
          shadowColor: theme.shadow,
          opacity: statusStyles.opacity,
        },
        animatedStyle,
      ]}>
      {/* Icono de estado a la izquierda */}
      <View style={[
        styles.iconContainer,
        styles.iconContainerCompact,
        { backgroundColor: `${statusStyles.iconColor}15` }
      ]}>
        <Ionicons 
          name={statusStyles.icon} 
          size={20} 
          color={statusStyles.iconColor} 
        />
      </View>

      <View style={[styles.content, styles.contentCompact]}>
        <View style={styles.merchantRow}>
          <Text style={[
            styles.merchant,
            styles.merchantCompact,
            { color: statusStyles.merchantColor }
          ]} numberOfLines={1}>
          {gasto.merchant}
          </Text>
        </View>
        <View style={styles.compactInfoRow}>
          <View style={[styles.statusBadge, styles.statusBadgeCompact, { backgroundColor: statusStyles.badgeBg }]}>
            <Text style={styles.statusTextCompact}>{statusStyles.badgeText}</Text>
          </View>
          <Text style={[styles.dateCompact, { color: theme.textSecondary }]}>
            {format(date, "d MMM, HH:mm", { locale: es })}
          </Text>
        </View>
      </View>
      
      <View style={styles.amountContainer}>
        <Text style={[
          styles.amount,
          styles.amountCompact,
          { color: statusStyles.amountColor }
        ]}>
          {isRefunded ? '+' : '-'}{amount.toFixed(2)} €
        </Text>
      </View>
    </Animated.View>
    </Pressable>

    {/* Modal rápido estilo iOS */}
    <Modal
      visible={showQuickModal}
      transparent={true}
      animationType="fade"
      onRequestClose={handlePressOut}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={handlePressOut}
      >
        <View style={[styles.quickModal, { backgroundColor: theme.card }]}>
          <View style={styles.quickModalHeader}>
            <Text style={[styles.quickModalTitle, { color: theme.text }]} numberOfLines={1}>
              {gasto.merchant}
            </Text>
          </View>
          
          <View style={styles.quickModalContent}>
            <View style={styles.quickModalRow}>
              <Ionicons name="cash-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.quickModalLabel, { color: theme.textSecondary }]}>Importe:</Text>
              <Text style={[styles.quickModalValue, { color: theme.text }]}>
                {Math.abs(gasto.amount).toFixed(2)} €
              </Text>
            </View>
            
            <View style={styles.quickModalRow}>
              <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.quickModalLabel, { color: theme.textSecondary }]}>Fecha:</Text>
              <Text style={[styles.quickModalValue, { color: theme.text }]}>
                {format(date, "d MMM yyyy, HH:mm", { locale: es })}
              </Text>
            </View>
            
            {gasto.location && (
              <View style={styles.quickModalRow}>
                <Ionicons name="location-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.quickModalLabel, { color: theme.textSecondary }]}>Ubicación:</Text>
                <Text style={[styles.quickModalValue, { color: theme.text }]} numberOfLines={1}>
                  {gasto.location}
                </Text>
              </View>
            )}
            
            <View style={styles.quickModalRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.quickModalLabel, { color: theme.textSecondary }]}>Estado:</Text>
              <Text style={[styles.quickModalValue, { 
                color: gasto.approved === false ? theme.error : '#10b981' 
              }]}>
                {gasto.approved === false ? 'Rechazado' : gasto.status === 'complete' ? 'Aprobado' : 'Pendiente'}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  containerCompact: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  contentCompact: {
    marginRight: 8,
  },
  merchantRow: {
    marginBottom: 6,
  },
  merchant: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  merchantCompact: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  badgeRow: {
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    flex: 1,
  },
  amountContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 80,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  amountCompact: {
    fontSize: 16,
  },
  compactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statusBadgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusTextCompact: {
    fontSize: 9,
    fontWeight: '700',
  },
  dateCompact: {
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickModal: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  quickModalHeader: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  quickModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  quickModalContent: {
    padding: 20,
    gap: 16,
  },
  quickModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickModalLabel: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 80,
  },
  quickModalValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
});

