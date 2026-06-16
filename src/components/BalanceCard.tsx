import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../config/theme';
import { spacing, radius, typography, cardShadow } from '../config/design';
import { GlassSurface } from './GlassSurface';

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
}) => {
  const theme = useTheme();
  const absTotalSpent = Math.abs(totalSpent);

  const companySpent = Math.min(absTotalSpent, companyBudget);
  const payrollSpent = Math.max(0, absTotalSpent - companyBudget);
  const companyRemaining = companyBudget - companySpent;
  const payrollRemaining = payrollBudget - payrollSpent;

  const remaining = companyRemaining;
  const percentage = companyBudget > 0 ? (absTotalSpent / companyBudget) * 100 : 0;
  const isOverBudget = remaining < 0;
  const isCompanyBudgetMaxed = absTotalSpent >= companyBudget;
  const isPayrollBudgetMaxed = payrollSpent >= payrollBudget;

  const barColor = isCompanyBudgetMaxed || isOverBudget
    ? theme.error
    : percentage > 80
      ? theme.warning
      : theme.success;
  const amountColor = isOverBudget ? theme.error : theme.success;

  return (
    <GlassSurface
      glassStyle="regular"
      fallbackColor={theme.cardElevated}
      style={[styles.container, { shadowColor: theme.shadow }]}
    >
      {/* Hero: saldo restante */}
      <Text style={[styles.label, { color: theme.textSecondary }]}>SALDO RESTANTE</Text>
      <Text style={[styles.amount, { color: amountColor }]}>
        {remaining.toFixed(2)}<Text style={styles.currency}> €</Text>
      </Text>

      {/* Barra de progreso principal */}
      <View style={[styles.progressBar, { backgroundColor: theme.separator }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(percentage, 100)}%`, backgroundColor: barColor },
          ]}
        />
      </View>
      <Text style={[styles.progressCaption, { color: theme.textTertiary }]}>
        {absTotalSpent.toFixed(0)} de {companyBudget.toFixed(0)} € · {percentage.toFixed(0)}% usado
      </Text>

      {/* Presupuesto de nómina (solo si se superó el de empresa) */}
      {absTotalSpent >= companyBudget && (
        <View style={styles.payrollBlock}>
          <View style={styles.payrollHeader}>
            <Text style={[styles.payrollLabel, { color: theme.textSecondary }]}>Presupuesto Nómina</Text>
            <Text style={[styles.payrollAmount, { color: theme.text }]}>
              {payrollSpent.toFixed(2)} / {payrollBudget.toFixed(2)} €
            </Text>
          </View>
          <View style={[styles.payrollBar, { backgroundColor: theme.separator }]}>
            <View
              style={[
                styles.payrollFill,
                {
                  width: `${Math.min((payrollSpent / payrollBudget) * 100, 100)}%`,
                  backgroundColor: isPayrollBudgetMaxed ? theme.error : theme.warning,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Chips de estadísticas */}
      <View style={styles.chipsRow}>
        <View style={[styles.chip, { backgroundColor: theme.inputBg }]}>
          <Text style={[styles.chipLabel, { color: theme.textSecondary }]}>Gastado</Text>
          <Text style={[styles.chipValue, { color: theme.text }]}>{absTotalSpent.toFixed(2)} €</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: theme.inputBg }]}>
          <Text style={[styles.chipLabel, { color: theme.textSecondary }]}>Presupuesto</Text>
          <Text style={[styles.chipValue, { color: theme.text }]}>{companyBudget.toFixed(0)} €</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: theme.inputBg }]}>
          <Text style={[styles.chipLabel, { color: theme.textSecondary }]}>% usado</Text>
          <Text style={[styles.chipValue, { color: isOverBudget ? theme.error : theme.text }]}>
            {percentage.toFixed(0)}%
          </Text>
        </View>
      </View>
    </GlassSurface>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
    ...cardShadow,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  amount: {
    fontSize: 46,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: spacing.xl,
  },
  currency: {
    fontSize: 26,
    fontWeight: '700',
  },
  progressBar: {
    width: '100%',
    height: 10,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  progressCaption: {
    ...typography.footnote,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  payrollBlock: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  payrollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  payrollLabel: {
    ...typography.footnote,
    fontWeight: '600',
  },
  payrollAmount: {
    ...typography.footnote,
    fontWeight: '700',
  },
  payrollBar: {
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  payrollFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  chip: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  chipLabel: {
    ...typography.caption,
    marginBottom: 2,
  },
  chipValue: {
    ...typography.subhead,
    fontWeight: '700',
  },
});
