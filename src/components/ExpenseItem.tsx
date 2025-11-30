import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
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
  const date = parseISO(gasto.date);
  const formattedDate = format(date, "d 'de' MMMM, HH:mm", { locale: es });
  const amount = Math.abs(gasto.amount);

  const handlePress = () => {
    navigation.navigate('ExpenseDetail', { gasto });
  };
  
  // Determinar el estado del gasto
  const status = gasto.status?.toLowerCase() || '';
  const isRejected = gasto.approved === false || status === 'rejected' || status === 'decline';
  const isRefunded = status === 'refund';
  const isReversed = status === 'reverse';
  const isComplete = status === 'complete';
  const isPending = !status || status === 'pending' || (!isRejected && !isRefunded && !isReversed && !isComplete);
  
  // Animación simple: más grande y luego más pequeño
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isHighlighted) {
      console.log('✨ [ExpenseItem] Gasto resaltado detectado! ID:', gasto.id);
      
      // Resetear valor antes de animar
      scaleAnim.setValue(1);
      
      // Animación simple: grande -> pequeño
      Animated.sequence([
        // Hacer más grande
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 400,
          useNativeDriver: true,
        }),
        // Volver a tamaño normal
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        console.log('✅ [ExpenseItem] Animación completada para gasto:', gasto.id);
      });
    } else {
      // Resetear animación cuando no está resaltado
      scaleAnim.setValue(1);
    }
  }, [isHighlighted]);

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

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <Animated.View style={[
        styles.container, 
        { 
          backgroundColor: statusStyles.containerBg,
          borderColor: statusStyles.borderColor,
          borderWidth: statusStyles.borderWidth,
          shadowColor: theme.shadow,
          opacity: statusStyles.opacity,
          transform: [
            { scale: scaleAnim }
          ],
        }
      ]}>
      {/* Icono de estado a la izquierda */}
      <View style={[styles.iconContainer, { backgroundColor: `${statusStyles.iconColor}15` }]}>
        <Ionicons 
          name={statusStyles.icon} 
          size={24} 
          color={statusStyles.iconColor} 
        />
      </View>

      <View style={styles.content}>
        <View style={styles.merchantRow}>
          <Text style={[
            styles.merchant, 
            { color: statusStyles.merchantColor }
          ]} numberOfLines={2}>
          {gasto.merchant}
          </Text>
        </View>
        <View style={styles.badgeRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyles.badgeBg }]}>
            <Text style={styles.statusText}>{statusStyles.badgeText}</Text>
          </View>
        </View>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={12} color={theme.textSecondary} />
          <Text style={[styles.date, { color: theme.textSecondary }]}>{formattedDate}</Text>
        </View>
        {(gasto.location || gasto.city || gasto.country) && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
            <Text style={[styles.locationText, { color: theme.textSecondary }]} numberOfLines={1}>
              {gasto.location || [gasto.city, gasto.country].filter(Boolean).join(', ') || ''}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.amountContainer}>
        <Text style={[
          styles.amount, 
          { color: statusStyles.amountColor }
        ]}>
          {isRefunded ? '+' : '-'}{amount.toFixed(2)} €
        </Text>
      </View>
    </Animated.View>
    </TouchableOpacity>
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  merchantRow: {
    marginBottom: 6,
  },
  merchant: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
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
});

