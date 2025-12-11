import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../config/theme';

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
  
  // Separar mes y año
  const monthParts = capitalizedMonth.split(' ');
  const monthOnly = monthParts[0];
  const yearOnly = monthParts[1];

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <View style={styles.content}>
        <TouchableOpacity 
          onPress={onPrevious} 
          style={styles.button}
          activeOpacity={0.6}
        >
          <Ionicons name="chevron-back" size={18} color={theme.text} />
        </TouchableOpacity>
        
        <View style={styles.monthContainer}>
          <Text style={[styles.monthText, { color: theme.text }]}>{monthOnly}</Text>
          <Text style={[styles.yearText, { color: theme.textSecondary }]}>{yearOnly}</Text>
        </View>
        
        <TouchableOpacity 
          onPress={onNext} 
          disabled={isNextDisabled}
          activeOpacity={0.6}
          style={styles.button}
        >
          <Ionicons 
            name="chevron-forward" 
            size={18} 
            color={isNextDisabled ? theme.textSecondary : theme.text} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  yearText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});

