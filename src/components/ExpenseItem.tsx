import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Gasto } from '../types';
import { useTheme } from '../config/theme';

interface ExpenseItemProps {
  gasto: Gasto;
  isHighlighted?: boolean;
}

export const ExpenseItem: React.FC<ExpenseItemProps> = ({ gasto, isHighlighted = false }) => {
  const theme = useTheme();
  const date = parseISO(gasto.date);
  const formattedDate = format(date, "d 'de' MMMM, HH:mm", { locale: es });
  const amount = Math.abs(gasto.amount);
  const isRejected = gasto.approved === false || gasto.status === 'rejected';
  
  // Animación para resaltar el gasto nuevo
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isHighlighted) {
      console.log('✨ [ExpenseItem] Gasto resaltado detectado! ID:', gasto.id);
      console.log('✨ [ExpenseItem] Iniciando animación de resaltado...');
      
      // Resetear valores antes de animar
      highlightAnim.setValue(0);
      scaleAnim.setValue(1);
      
      // Animación de pulso y resaltado - todas con useNativeDriver: false para evitar conflictos
      Animated.sequence([
        Animated.parallel([
          Animated.timing(highlightAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.02,
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: false,
            }),
          ]),
        ]),
        Animated.timing(highlightAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ]).start(() => {
        console.log('✅ [ExpenseItem] Animación completada para gasto:', gasto.id);
      });
    } else {
      // Resetear animaciones cuando no está resaltado
      highlightAnim.setValue(0);
      scaleAnim.setValue(1);
      console.log('ℹ️ [ExpenseItem] Gasto normal, ID:', gasto.id, 'isHighlighted:', isHighlighted);
    }
  }, [isHighlighted]);

  const borderColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', theme.success],
  });

  return (
    <Animated.View style={[
      styles.container, 
      { 
        backgroundColor: theme.card, 
        shadowColor: theme.shadow,
        opacity: isRejected ? 0.5 : 1,
        transform: [{ scale: scaleAnim }],
        borderWidth: isHighlighted ? 2 : 0,
        borderColor: borderColor,
      }
    ]}>
      <View style={styles.content}>
        <View style={styles.merchantRow}>
          <Text style={[
            styles.merchant, 
            { color: isRejected ? theme.textSecondary : theme.text }
          ]} numberOfLines={1}>
          {gasto.merchant}
        </Text>
          {isRejected && (
            <View style={[styles.rejectedBadge, { backgroundColor: theme.error }]}>
              <Text style={styles.rejectedText}>Rechazado</Text>
            </View>
          )}
        </View>
        <Text style={[styles.date, { color: theme.textSecondary }]}>{formattedDate}</Text>
      </View>
      <View style={styles.amountContainer}>
        <Text style={[
          styles.amount, 
          { color: isRejected ? theme.textSecondary : theme.error }
        ]}>
          -{amount.toFixed(2)} €
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  merchant: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  rejectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rejectedText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  date: {
    fontSize: 13,
  },
  amountContainer: {
    justifyContent: 'center',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

