import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { useTheme } from '../config/theme';

interface BalanceCardProps {
  totalSpent: number;
  companyBudget: number;
  payrollBudget: number;
  month: number;
  year: number;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  totalSpent,
  companyBudget,
  payrollBudget,
  month,
  year,
}) => {
  const theme = useTheme();
  const totalBudget = companyBudget + payrollBudget;
  const absTotalSpent = Math.abs(totalSpent);
  
  // Calcular cuánto se consume de cada presupuesto
  const companySpent = Math.min(absTotalSpent, companyBudget);
  const payrollSpent = Math.max(0, absTotalSpent - companyBudget);
  const companyRemaining = companyBudget - companySpent;
  const payrollRemaining = payrollBudget - payrollSpent;
  
  // El saldo restante solo considera el presupuesto de la empresa (los 20€ de nómina no se deben gastar)
  const remaining = companyRemaining;
  const percentage = companyBudget > 0 ? (absTotalSpent / companyBudget) * 100 : 0;
  const isOverBudget = remaining < 0;

  const monthName = format(new Date(year, month - 1), 'MMMM', { locale: es });

  return (
    <View style={[styles.container, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>

      <View style={styles.balanceContainer}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Saldo restante</Text>
        <Text style={[styles.amount, { color: theme.success }, isOverBudget && { color: theme.error }]}>
          {remaining.toFixed(2)} €
        </Text>
      </View>

      <View style={styles.budgetBreakdown}>
        <View style={styles.budgetItem}>
          <View style={styles.budgetHeader}>
            <Text style={[styles.budgetLabel, { color: theme.textSecondary }]}>Presupuesto Empresa</Text>
            <Text style={[styles.budgetAmount, { color: theme.text }]}>
              {companyRemaining.toFixed(2)} / {companyBudget.toFixed(2)} €
            </Text>
          </View>
          <View style={[styles.budgetProgressBar, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.budgetProgressFill,
                {
                  width: `${Math.min((companySpent / companyBudget) * 100, 100)}%`,
                  backgroundColor: companyRemaining <= 0 ? theme.error : theme.success,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.budgetItem}>
          <View style={styles.budgetHeader}>
            <Text style={[styles.budgetLabel, { color: theme.textSecondary }]}>Presupuesto Nómina</Text>
            <Text style={[styles.budgetAmount, { color: theme.text }]}>
              {payrollRemaining.toFixed(2)} / {payrollBudget.toFixed(2)} €
            </Text>
          </View>
          <View style={[styles.budgetProgressBar, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.budgetProgressFill,
                {
                  width: `${Math.min((payrollSpent / payrollBudget) * 100, 100)}%`,
                  backgroundColor: payrollRemaining <= 0 ? theme.error : payrollSpent > 0 ? theme.warning : theme.success,
                },
              ]}
            />
          </View>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Gastado</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>{absTotalSpent.toFixed(2)} €</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Presupuesto Empresa</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>{companyBudget.toFixed(2)} €</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>% usado</Text>
          <Text style={[styles.statValue, { color: theme.text }, isOverBudget && { color: theme.error }]}>
            {percentage.toFixed(1)}%
          </Text>
        </View>
      </View>

      <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: isOverBudget ? theme.error : percentage > 80 ? theme.warning : theme.success,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  balanceContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
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
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetBreakdown: {
    marginBottom: 20,
  },
  budgetItem: {
    marginBottom: 16,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  budgetAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  budgetProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
});

