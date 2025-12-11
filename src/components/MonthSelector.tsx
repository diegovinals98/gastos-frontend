import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
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

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <TouchableOpacity onPress={onPrevious} style={[styles.button, { backgroundColor: theme.button }]}>
        <Text style={[styles.buttonText, { color: theme.text }]}>‹</Text>
      </TouchableOpacity>
      
      <Text style={[styles.monthText, { color: theme.text }]}>{capitalizedMonth}</Text>
      
      <TouchableOpacity 
        onPress={onNext} 
        disabled={isNextDisabled}
        style={[
          styles.button, 
          { 
            backgroundColor: theme.button,
            opacity: isNextDisabled ? 0.3 : 1,
          }
        ]}
      >
        <Text style={[styles.buttonText, { color: theme.text }]}>›</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

