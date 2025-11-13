import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

interface BalanceCardProps {
  totalSpent: number;
  monthlyBudget: number;
  month: number;
  year: number;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  totalSpent,
  monthlyBudget,
  month,
  year,
}) => {
  const remaining = monthlyBudget + totalSpent; // totalSpent is negative
  const percentage = monthlyBudget > 0 ? Math.abs((totalSpent / monthlyBudget) * 100) : 0;
  const isOverBudget = remaining < 0;

  const monthName = format(new Date(year, month - 1), 'MMMM', { locale: es });

  return (
    <View style={styles.container}>
      <Text style={styles.monthText}>
        {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {year}
      </Text>
      
      <View style={styles.balanceContainer}>
        <Text style={styles.label}>Saldo restante</Text>
        <Text style={[styles.amount, isOverBudget && styles.overBudget]}>
          {remaining.toFixed(2)} €
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Gastado</Text>
          <Text style={styles.statValue}>{Math.abs(totalSpent).toFixed(2)} €</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Presupuesto</Text>
          <Text style={styles.statValue}>{monthlyBudget.toFixed(2)} €</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>% usado</Text>
          <Text style={[styles.statValue, isOverBudget && styles.overBudget]}>
            {percentage.toFixed(1)}%
          </Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: isOverBudget ? '#ef4444' : percentage > 80 ? '#f59e0b' : '#10b981',
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  balanceContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#10b981',
  },
  overBudget: {
    color: '#ef4444',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});

