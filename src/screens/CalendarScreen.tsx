import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../config/theme';
import { fetchGastos } from '../services/api';
import { GastosResponse, Gasto } from '../types';

interface DayData {
  date: Date;
  gastos: Gasto[];
  totalSpent: number;
}

export const CalendarScreen: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [daysData, setDaysData] = useState<Map<string, DayData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const colorScheme = useColorScheme();
  const theme = useTheme();

  useEffect(() => {
    loadMonthData();
  }, [currentDate]);

  const loadMonthData = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const data: GastosResponse = await fetchGastos(month, year);
      const daysMap = new Map<string, DayData>();

      // Procesar gastos por día
      data.gastos.forEach((gasto) => {
        const gastoDate = parseISO(gasto.date);
        const dayKey = format(gastoDate, 'yyyy-MM-dd');

        if (!daysMap.has(dayKey)) {
          daysMap.set(dayKey, {
            date: gastoDate,
            gastos: [],
            totalSpent: 0,
          });
        }

        const dayData = daysMap.get(dayKey)!;
        dayData.gastos.push(gasto);

        // Solo contar gastos aprobados
        const status = gasto.status?.toLowerCase() || '';
        const isApproved =
          (gasto.approved !== false &&
            status !== 'rejected' &&
            status !== 'decline' &&
            status !== 'reverse' &&
            status !== 'refund') ||
          status === 'complete';

        if (isApproved) {
          dayData.totalSpent += Math.abs(gasto.amount);
        }
      });

      setDaysData(daysMap);
    } catch (error) {
      console.error('Error loading month data:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1, locale: es }); // Lunes
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1, locale: es });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    return (
      <View style={styles.calendarContainer}>
        {/* Días de la semana */}
        <View style={styles.weekDaysRow}>
          {weekDays.map((day, index) => (
            <View key={index} style={styles.weekDay}>
              <Text style={[styles.weekDayText, { color: theme.textSecondary }]}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Días del calendario */}
        <View style={styles.daysGrid}>
          {days.map((day, index) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayData = daysData.get(dayKey);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const hasGastos = dayData && dayData.gastos.length > 0;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  !isCurrentMonth && styles.dayCellOtherMonth,
                ]}
                onPress={() => {
                  if (isCurrentMonth) {
                    setSelectedDate(isSelected ? null : day);
                  }
                }}
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isToday && !isSelected && { 
                      backgroundColor: '#3b82f6',
                      borderWidth: 2,
                      borderColor: '#3b82f6',
                    },
                    isSelected && {
                      backgroundColor: '#3b82f6',
                      transform: [{ scale: 1.1 }],
                    },
                    !isCurrentMonth && styles.dayCircleOtherMonth,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: isSelected
                          ? '#ffffff'
                          : isToday
                          ? '#ffffff'
                          : isCurrentMonth
                          ? theme.text
                          : theme.textSecondary,
                        fontWeight: isToday || isSelected ? 'bold' : 'normal',
                      },
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                </View>
                {hasGastos && isCurrentMonth && (
                  <View
                    style={[
                      styles.gastoIndicator,
                      {
                        backgroundColor: isSelected
                          ? '#ffffff'
                          : '#10b981',
                      },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderSelectedDayGastos = () => {
    if (!selectedDate) return null;

    const dayKey = format(selectedDate, 'yyyy-MM-dd');
    const dayData = daysData.get(dayKey);

    if (!dayData || dayData.gastos.length === 0) {
      return (
        <View style={[styles.gastosCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.noGastosText, { color: theme.textSecondary }]}>
              No hay pagos este día
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.gastosCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
        <View style={styles.gastosHeader}>
          <View>
            <Text style={[styles.gastosTitle, { color: theme.text }]}>
              {format(selectedDate, "EEEE", { locale: es })}
            </Text>
            <Text style={[styles.gastosDate, { color: theme.textSecondary }]}>
              {format(selectedDate, "d 'de' MMMM", { locale: es })}
            </Text>
          </View>
          <View style={[styles.totalBadge, { backgroundColor: theme.background }]}>
            <Text style={[styles.totalBadgeText, { color: theme.text }]}>
              {dayData.gastos.length} {dayData.gastos.length === 1 ? 'pago' : 'pagos'}
            </Text>
            <Text style={[styles.totalBadgeAmount, { color: '#10b981' }]}>
              {dayData.totalSpent.toFixed(2)} €
            </Text>
          </View>
        </View>

        <View style={styles.gastosList}>
          {[...dayData.gastos]
            .sort((a, b) => {
              // Ordenar por hora: más tempranos arriba, más tardíos abajo
              const dateA = parseISO(a.date).getTime();
              const dateB = parseISO(b.date).getTime();
              return dateA - dateB;
            })
            .map((gasto) => {
            const status = gasto.status?.toLowerCase() || '';
            const isRejected =
              gasto.approved === false || status === 'rejected' || status === 'decline';
            const isComplete = status === 'complete';

            return (
              <View
                key={gasto.id}
                style={[
                  styles.gastoItem,
                  {
                    backgroundColor: theme.background,
                    borderLeftColor: isRejected
                      ? theme.error
                      : isComplete
                      ? '#10b981'
                      : theme.textSecondary,
                  },
                ]}
              >
                <View style={styles.gastoIconContainer}>
                  <Ionicons
                    name={isRejected ? 'close-circle' : isComplete ? 'checkmark-circle' : 'time'}
                    size={24}
                    color={isRejected ? theme.error : isComplete ? '#10b981' : theme.textSecondary}
                  />
                </View>
                <View style={styles.gastoContent}>
                  <Text style={[styles.gastoMerchant, { color: theme.text }]} numberOfLines={1}>
                    {gasto.merchant}
                  </Text>
                  <View style={styles.gastoMeta}>
                    <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
                    <Text style={[styles.gastoTime, { color: theme.textSecondary }]}>
                      {format(parseISO(gasto.date), 'HH:mm', { locale: es })}
                    </Text>
                  </View>
                </View>
                <View style={styles.gastoAmountContainer}>
                  <Text
                    style={[
                      styles.gastoAmount,
                      {
                        color: isRejected ? theme.textSecondary : theme.error,
                        opacity: isRejected ? 0.6 : 1,
                      },
                    ]}
                  >
                    {Math.abs(gasto.amount).toFixed(2)} €
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const monthName = format(currentDate, 'MMMM yyyy', { locale: es });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {/* Header fijo - siempre visible */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Calendario</Text>

          </View>
          <TouchableOpacity
            onPress={goToToday}
            style={[styles.todayButton, { backgroundColor: '#3b82f6' }]}
          >
            <Ionicons name="calendar" size={16} color="#ffffff" />
            <Text style={styles.todayButtonText}>Hoy</Text>
          </TouchableOpacity>
        </View>

        {/* Navegación de mes mejorada - siempre visible */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity
            onPress={goToPreviousMonth}
            style={[styles.navButton, { backgroundColor: theme.card }]}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.monthNameContainer}>
            <Text style={[styles.monthName, { color: theme.text }]}>{capitalizedMonth}</Text>
          </View>

          <TouchableOpacity
            onPress={goToNextMonth}
            style={[styles.navButton, { backgroundColor: theme.card }]}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Ionicons name="chevron-forward" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendario fijo - muestra loading solo en los días */}
      <View style={[styles.calendarCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
        {loading ? (
          <View style={styles.calendarLoadingContainer}>
            <ActivityIndicator size="small" color={theme.textSecondary} />
            <Text style={[styles.calendarLoadingText, { color: theme.textSecondary }]}>
              Cargando días...
            </Text>
          </View>
        ) : (
          renderCalendar()
        )}
      </View>

      {/* Gastos del día seleccionado con scroll si es necesario */}
      {selectedDate ? (
        <View style={styles.gastosScrollContainer}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gastosScrollContent}
          >
            {renderSelectedDayGastos()}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.emptySpace} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarLoadingContainer: {
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  calendarLoadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  todayButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  monthNameContainer: {
    flex: 1,
    alignItems: 'center',
  },
  monthName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  calendarCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  calendarContainer: {
    width: '100%',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    padding: 2,
  },
  dayCellOtherMonth: {
    opacity: 0.25,
  },
  dayCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayCircleOtherMonth: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
  },
  gastoIndicator: {
    position: 'absolute',
    bottom: 8,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  gastosScrollContainer: {
    flex: 1,
    marginTop: 8,
  },
  gastosScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  gastosContainer: {
    paddingHorizontal: 0,
  },
  emptySpace: {
    flex: 1,
  },
  gastosCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  gastosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  gastosTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  gastosDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalBadge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  totalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalBadgeAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  noGastosText: {
    marginTop: 12,
    fontSize: 15,
    textAlign: 'center',
  },
  gastosList: {
    gap: 10,
  },
  gastoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    gap: 12,
  },
  gastoIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gastoContent: {
    flex: 1,
  },
  gastoMerchant: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  gastoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gastoTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  gastoAmountContainer: {
    alignItems: 'flex-end',
  },
  gastoAmount: {
    fontSize: 17,
    fontWeight: '700',
  },
});
