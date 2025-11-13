import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Gasto } from '../types';

interface ExpenseItemProps {
  gasto: Gasto;
}

export const ExpenseItem: React.FC<ExpenseItemProps> = ({ gasto }) => {
  const date = parseISO(gasto.date);
  const formattedDate = format(date, "d 'de' MMMM, HH:mm", { locale: es });
  const amount = Math.abs(gasto.amount);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.merchant} numberOfLines={1}>
          {gasto.merchant}
        </Text>
        <Text style={styles.date}>{formattedDate}</Text>
      </View>
      <View style={styles.amountContainer}>
        <Text style={styles.amount}>-{amount.toFixed(2)} €</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  merchant: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: '#6b7280',
  },
  amountContainer: {
    justifyContent: 'center',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
  },
});

