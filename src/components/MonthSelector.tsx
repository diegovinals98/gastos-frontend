import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../config/theme';
import { spacing, radius, typography } from '../config/design';

interface MonthSelectorProps {
  month: number;
  year: number;
  onPrevious: () => void;
  onNext: () => void;
  isNextDisabled?: boolean;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  month,
  year,
  onPrevious,
  onNext,
  isNextDisabled = false,
}) => {
  const theme = useTheme();
  const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: es });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const monthParts = capitalizedMonth.split(' ');
  const monthOnly = monthParts[0];
  const yearOnly = monthParts[1];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPrevious}
        style={[styles.button, { backgroundColor: theme.inputBg }]}
        activeOpacity={0.6}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={20} color={theme.text} />
      </TouchableOpacity>

      <View style={styles.monthContainer}>
        <Text style={[styles.monthText, { color: theme.text }]}>{monthOnly}</Text>
        <Text style={[styles.yearText, { color: theme.textTertiary }]}>{yearOnly}</Text>
      </View>

      <TouchableOpacity
        onPress={onNext}
        disabled={isNextDisabled}
        activeOpacity={0.6}
        hitSlop={8}
        style={[styles.button, { backgroundColor: theme.inputBg, opacity: isNextDisabled ? 0.4 : 1 }]}
      >
        <Ionicons
          name="chevron-forward"
          size={20}
          color={isNextDisabled ? theme.textSecondary : theme.text}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    ...typography.title2,
    letterSpacing: 0.2,
  },
  yearText: {
    ...typography.caption,
    marginTop: 1,
  },
});
