import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DayData {
  date: Date;
  gastos: Gasto[];
  totalSpent: number;
}

export const CalendarScreen: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [daysData, setDaysData] = useState<Map<string, DayData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const colorScheme = useColorScheme();
  const theme = useTheme();
  
  // Refs para acceder a los valores actuales en worklets
  const currentDateRef = useRef(currentDate);
  
  // Actualizar ref cuando cambia currentDate
  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);
  
  // Valores animados para gestos
  const screenWidth = Dimensions.get('window').width;
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isAnimating = useSharedValue(false);
  const shakeX = useSharedValue(0);

  // Función auxiliar para obtener la clave de almacenamiento
  const getStorageKey = (month: number, year: number): string => {
    return `@calendar_gastos_${year}_${month}`;
  };

  // Función para guardar datos en AsyncStorage
  const saveDataToStorage = async (month: number, year: number, daysMap: Map<string, DayData>) => {
    try {
      const key = getStorageKey(month, year);
      const data = Array.from(daysMap.entries());
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving calendar data:', error);
    }
  };

  // Función para cargar datos desde AsyncStorage
  const loadDataFromStorage = async (month: number, year: number): Promise<Map<string, DayData> | null> => {
    try {
      const key = getStorageKey(month, year);
      const storedData = await AsyncStorage.getItem(key);
      if (storedData) {
        const data = JSON.parse(storedData) as Array<[string, DayData]>;
        const daysMap = new Map<string, DayData>();
        data.forEach(([key, value]) => {
          daysMap.set(key, {
            ...value,
            date: new Date(value.date),
            gastos: value.gastos.map(g => ({ ...g, date: g.date })),
          });
        });
        return daysMap;
      }
      return null;
    } catch (error) {
      console.error('Error loading calendar data:', error);
      return null;
    }
  };

  // Función para encontrar el primer día con gastos en el mes actual
  const findFirstDayWithGastos = useCallback((daysMap: Map<string, DayData>, year: number, month: number): Date | null => {
    // Buscar el primer día del mes que tenga gastos
    const monthStart = startOfMonth(new Date(year, month, 1));
    const monthEnd = endOfMonth(new Date(year, month, 1));
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    for (const day of days) {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayData = daysMap.get(dayKey);
      if (dayData && dayData.gastos.length > 0) {
        return day;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    loadMonthData();
  }, [currentDate]);

  // Efecto para seleccionar el día apropiado cuando cambian los datos o el mes
  useEffect(() => {
    if (daysData.size === 0) return; // Esperar a que se carguen los datos
    
    const today = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    
    // Si estamos en el mes actual, seleccionar hoy
    if (currentYear === todayYear && currentMonth === todayMonth) {
      setSelectedDate(today);
    } else {
      // Buscar el primer día con gastos
      const firstDayWithGastos = findFirstDayWithGastos(daysData, currentYear, currentMonth);
      if (firstDayWithGastos) {
        setSelectedDate(firstDayWithGastos);
      } else {
        // Si no hay gastos, seleccionar el día 1 del mes
        setSelectedDate(new Date(currentYear, currentMonth, 1));
      }
    }
  }, [currentDate, daysData, findFirstDayWithGastos]);

  const loadMonthData = async (forceRefresh: boolean = false) => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      setLoading(true);

      // Si no es un refresh forzado, intentar cargar desde storage primero
      if (!forceRefresh) {
        const cachedData = await loadDataFromStorage(month, year);
        if (cachedData) {
          setDaysData(cachedData);
          setLoading(false); // Mostrar datos inmediatamente
        }
      }

      // Siempre hacer la llamada a la API para obtener datos frescos
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
      
      // Guardar en storage
      await saveDataToStorage(month, year, daysMap);
    } catch (error) {
      console.error('Error loading month data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para cambiar el mes (se ejecuta desde runOnJS en gestos)
  const changeMonth = useCallback((direction: 'left' | 'right') => {
    const current = currentDateRef.current;
    const currentMonth = current.getMonth();
    const currentYear = current.getFullYear();
    
    if (direction === 'right') {
      // Swipe right - mes anterior
      const newDate = new Date(currentYear, currentMonth - 1, 1);
      setCurrentDate(newDate);
      // La selección del día se hará en el useEffect cuando se carguen los datos
    } else {
      // Swipe left - mes siguiente
      const currentDateObj = new Date();
      const maxMonth = currentDateObj.getMonth();
      const maxYear = currentDateObj.getFullYear();
      
      // Si estamos en el mes actual, mostrar animación de rechazo
      if (currentYear === maxYear && currentMonth === maxMonth) {
        // Animación de shake (rechazo)
        shakeX.value = withTiming(-10, { duration: 50 }, () => {
          'worklet';
          shakeX.value = withTiming(10, { duration: 50 }, () => {
            'worklet';
            shakeX.value = withTiming(-10, { duration: 50 }, () => {
              'worklet';
              shakeX.value = withTiming(10, { duration: 50 }, () => {
                'worklet';
                shakeX.value = withTiming(0, { duration: 50 });
              });
            });
          });
        });
        return;
      }
      
      if (currentYear > maxYear || (currentYear === maxYear && currentMonth >= maxMonth)) {
        return; // Don't allow future months
      }
      
      const newDate = new Date(currentYear, currentMonth + 1, 1);
      setCurrentDate(newDate);
      // La selección del día se hará en el useEffect cuando se carguen los datos
    }
  }, []);

  // Función para animar el cambio de mes
  const animateMonthChange = useCallback((direction: 'left' | 'right') => {
    if (isAnimating.value) return;
    
    // Verificar si estamos intentando ir al mes siguiente desde el mes actual
    const current = currentDateRef.current;
    const currentMonth = current.getMonth();
    const currentYear = current.getFullYear();
    const currentDateObj = new Date();
    const maxMonth = currentDateObj.getMonth();
    const maxYear = currentDateObj.getFullYear();
    
    if (direction === 'left' && currentYear === maxYear && currentMonth === maxMonth) {
      // Mostrar animación de rechazo
      shakeX.value = withTiming(-10, { duration: 50 }, () => {
        'worklet';
        shakeX.value = withTiming(10, { duration: 50 }, () => {
          'worklet';
          shakeX.value = withTiming(-10, { duration: 50 }, () => {
            'worklet';
            shakeX.value = withTiming(10, { duration: 50 }, () => {
              'worklet';
              shakeX.value = withTiming(0, { duration: 50 });
            });
          });
        });
      });
      // También hacer un pequeño rebote en el contenido
      translateX.value = withTiming(-20, { duration: 100 }, () => {
        'worklet';
        translateX.value = withTiming(0, { duration: 150 });
      });
      return;
    }
    
    isAnimating.value = true;
    const targetX = direction === 'left' ? -screenWidth : screenWidth;
    
    // Animar salida
    translateX.value = withTiming(targetX, { duration: 200 });
    opacity.value = withTiming(0.3, { duration: 200 }, (finished) => {
      'worklet';
      if (!finished) return;
      
      // Ejecutar callback (cambiar mes) en el hilo JS
      runOnJS(changeMonth)(direction);
      
      // Resetear posición desde el lado opuesto
      translateX.value = direction === 'left' ? screenWidth : -screenWidth;
      
      // Animar entrada
      translateX.value = withTiming(0, {
        duration: 250,
      });
      opacity.value = withTiming(1, { duration: 250 }, (finished) => {
        'worklet';
        if (finished) {
          isAnimating.value = false;
        }
      });
    });
  }, [changeMonth, screenWidth]);

  // Funciones para cambiar mes desde botones (usando las mismas animaciones que los gestos)
  const goToPreviousMonth = useCallback(() => {
    // Swipe right = mes anterior
    animateMonthChange('right');
  }, [animateMonthChange]);

  const goToNextMonth = useCallback(() => {
    // Swipe left = mes siguiente
    animateMonthChange('left');
  }, [animateMonthChange]);

  // Crear el gesto Pan
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .onStart(() => {
      'worklet';
      if (isAnimating.value) return;
      translateX.value = 0;
      opacity.value = 1;
    })
    .onUpdate((event) => {
      'worklet';
      if (isAnimating.value) return;
      translateX.value = event.translationX;
      // Actualizar opacidad basada en la traducción
      const opacityValue = 1 - Math.min(Math.abs(event.translationX) / 200, 0.5);
      opacity.value = opacityValue;
    })
    .onEnd((event) => {
      'worklet';
      if (isAnimating.value) return;
      
      const { translationX, velocityX, translationY } = event;
      const absTranslationX = Math.abs(translationX);
      const absTranslationY = Math.abs(translationY || 0);
      const threshold = 50;
      const minVelocity = 300;
      
      // Verificar si es un deslizamiento horizontal
      if (absTranslationX > absTranslationY && (absTranslationX > threshold || Math.abs(velocityX) > minVelocity)) {
        if (translationX > 0 || velocityX > 0) {
          // Swipe right - ir al mes anterior
          runOnJS(animateMonthChange)('right');
        } else {
          // Swipe left - ir al mes siguiente
          runOnJS(animateMonthChange)('left');
        }
      } else {
        // No hay suficiente deslizamiento, volver a la posición original
        translateX.value = withTiming(0, {
          duration: 200,
        });
        opacity.value = withTiming(1, { duration: 200 });
      }
    });

  // Estilo animado para el contenido
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  // Estilo animado para el shake del header
  const shakeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeX.value }],
    };
  });

  // Verificar si estamos en el mes actual
  const isCurrentMonth = () => {
    const currentDateObj = new Date();
    return (
      currentDate.getFullYear() === currentDateObj.getFullYear() &&
      currentDate.getMonth() === currentDateObj.getMonth()
    );
  };

  // Resetear animación cuando cambia el mes
  useEffect(() => {
    if (!isAnimating.value) {
      translateX.value = 0;
      opacity.value = 1;
    }
  }, [currentDate]);

  // Función para animar el cambio directo a un mes (sin pasar por meses intermedios)
  const animateDirectMonthChange = useCallback((targetDate: Date, direction: 'left' | 'right') => {
    if (isAnimating.value) return;
    isAnimating.value = true;
    
    // Cambiar el mes primero
    setCurrentDate(targetDate);
    
    // Empezar desde el lado opuesto
    translateX.value = direction === 'left' ? screenWidth : -screenWidth;
    opacity.value = 0.3;
    
    // Animar entrada
    translateX.value = withTiming(0, {
      duration: 250,
    });
    opacity.value = withTiming(1, { duration: 250 }, (finished) => {
      'worklet';
      if (finished) {
        isAnimating.value = false;
      }
    });
    
    // Seleccionar hoy después de un pequeño delay
    setTimeout(() => {
      setSelectedDate(targetDate);
    }, 100);
  }, []);

  const goToToday = () => {
    const today = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    
    // Si ya estamos en el mes actual, solo seleccionar hoy sin animar
    if (currentYear === todayYear && currentMonth === todayMonth) {
      setSelectedDate(today);
      return;
    }
    
    // Calcular la diferencia de meses
    const monthDiff = (todayYear - currentYear) * 12 + (todayMonth - currentMonth);
    
    // Si la diferencia es solo 1 mes hacia atrás, usar la animación normal
    if (monthDiff === -1) {
      // Necesitamos ir hacia atrás (right) - un mes
      animateMonthChange('right');
    } else {
      // Si hay múltiples meses de diferencia o vamos hacia adelante,
      // cambiar directamente y animar desde la dirección correcta
      const direction = monthDiff < 0 ? 'right' : 'left';
      animateDirectMonthChange(today, direction);
    }
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
            const isTodayAndSelected = isToday && isSelected;
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
                    // Día de hoy cuando NO está seleccionado: borde azul, fondo transparente
                    isToday && !isSelected && { 
                      backgroundColor: 'transparent',
                      borderWidth: 2,
                      borderColor: '#3b82f6',
                    },
                    // Día seleccionado cuando NO es hoy: fondo azul sólido, más grande
                    isSelected && !isToday && {
                      backgroundColor: '#3b82f6',
                      transform: [{ scale: 1.15 }],
                      borderWidth: 0,
                    },
                    // Día seleccionado Y es hoy: fondo azul con borde más grueso y más grande
                    isTodayAndSelected && {
                      backgroundColor: '#3b82f6',
                      borderWidth: 3,
                      borderColor: '#ffffff',
                      transform: [{ scale: 1.2 }],
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
                          : isToday && !isSelected
                          ? '#3b82f6'
                          : isCurrentMonth
                          ? theme.text
                          : theme.textSecondary,
                        fontWeight: isToday || isSelected ? 'bold' : 'normal',
                        fontSize: isTodayAndSelected ? 16 : 15,
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
                          : isToday && !isSelected
                          ? '#3b82f6'
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
      <View style={styles.contentWrapper}>
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
              <Animated.View style={shakeAnimatedStyle}>
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
                    style={[
                      styles.navButton, 
                      { 
                        backgroundColor: theme.card,
                        opacity: isCurrentMonth() ? 0.4 : 1,
                      }
                    ]}
                    activeOpacity={0.7}
                    disabled={loading || isCurrentMonth()}
                  >
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color={isCurrentMonth() ? theme.textSecondary : theme.text} 
                    />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>

            {/* Calendario con gestos y animaciones */}
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[styles.calendarCard, { backgroundColor: theme.card, shadowColor: theme.shadow }, animatedStyle]}>
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
              </Animated.View>
            </GestureDetector>

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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
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
