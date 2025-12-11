import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  Alert,
  AppState,
  AppStateStatus,
  useColorScheme,
  View,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { BalanceCard } from '../components/BalanceCard';
import { ExpensesList } from '../components/ExpensesList';
import { MonthSelector } from '../components/MonthSelector';
import { fetchGastos } from '../services/api';
import { GastosResponse, Gasto } from '../types';
import {
  registerForPushNotificationsAsync,
} from '../services/notifications';
import { COMPANY_BUDGET, PAYROLL_BUDGET } from '../config/env';
import * as Notifications from 'expo-notifications';

type RootStackParamList = {
  Home: undefined;
  ExpenseDetail: { gasto: Gasto };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'ExpenseDetail'>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [gastosData, setGastosData] = useState<GastosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [highlightedExpenseId, setHighlightedExpenseId] = useState<string | null>(null);
  const [pendingNavigationId, setPendingNavigationId] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const flatListRef = useRef<any>(null);
  const navigateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs para acceder a los valores actuales en worklets
  const monthRef = useRef(month);
  const yearRef = useRef(year);
  
  // Actualizar refs cuando cambian los valores
  useEffect(() => {
    monthRef.current = month;
    yearRef.current = year;
  }, [month, year]);
  
  // Valores animados para gestos
  const screenWidth = Dimensions.get('window').width;
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isAnimating = useSharedValue(false);

  // Función auxiliar para extraer ID de la notificación
  const extractIdFromNotification = (notification: any): string | null => {
    console.log('🔍 [extractIdFromNotification] Iniciando extracción de ID...');
    console.log('🔍 [extractIdFromNotification] Notification completa:', JSON.stringify(notification, null, 2));
    
    // Intentar extraer el ID del body o title de la notificación
    const content = notification.request?.content;
    console.log('🔍 [extractIdFromNotification] Content:', JSON.stringify(content, null, 2));
    
    // Buscar en data.gastos[0].id (estructura de la notificación)
    if (content?.data?.gastos && Array.isArray(content.data.gastos) && content.data.gastos.length > 0) {
      const gastoId = content.data.gastos[0]?.id;
      if (gastoId) {
        console.log('✅ [extractIdFromNotification] ID encontrado en data.gastos[0].id:', gastoId);
        return String(gastoId);
      }
    }
    
    if (content?.data?.gastoId) {
      console.log('✅ [extractIdFromNotification] ID encontrado en data.gastoId:', content.data.gastoId);
      return String(content.data.gastoId);
    }
    if (content?.data?.id) {
      console.log('✅ [extractIdFromNotification] ID encontrado en data.id:', content.data.id);
      return String(content.data.id);
    }
    
    // Si no está en data, intentar parsear del body o title
    const body = content?.body || '';
    const title = content?.title || '';
    const text = `${title} ${body}`;
    console.log('🔍 [extractIdFromNotification] Buscando ID en texto:', text);
    
    // Buscar patrones como "ID: 123" o números que podrían ser IDs
    const idMatch = text.match(/\b(\d{4,})\b/);
    if (idMatch) {
      console.log('✅ [extractIdFromNotification] ID encontrado parseando texto:', idMatch[1]);
      return idMatch[1];
    }
    
    console.log('❌ [extractIdFromNotification] No se pudo extraer ID de la notificación');
    return null;
  };

  const loadGastos = async () => {
    try {
      console.log('📥 [loadGastos] Iniciando carga de gastos...');
      console.log('📥 [loadGastos] Mes:', month, 'Año:', year);
      console.log('📥 [loadGastos] highlightedExpenseId actual:', highlightedExpenseId);
     
      setLoading(true);
      const data = await fetchGastos(month, year);
      console.log('📥 [loadGastos] Gastos recibidos:', data?.gastos?.length || 0);
      console.log('📥 [loadGastos] IDs de gastos:', data?.gastos?.map(g => g.id) || []);
      
      setGastosData(data);
      
      // Si hay un gasto para resaltar, hacer scroll a él después de un breve delay
      if (highlightedExpenseId && data?.gastos) {
        console.log('🎯 [loadGastos] Buscando gasto para resaltar con ID:', highlightedExpenseId);
        const index = data.gastos.findIndex(g => String(g.id) === String(highlightedExpenseId));
        console.log('🎯 [loadGastos] Índice encontrado:', index);
        
        if (index !== -1 && flatListRef.current) {
          console.log('🎯 [loadGastos] Haciendo scroll al índice', index);
          setTimeout(() => {
            try {
              flatListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.5 });
              console.log('✅ [loadGastos] Scroll completado');
            } catch (scrollError) {
              console.error('❌ [loadGastos] Error al hacer scroll:', scrollError);
            }
          }, 300);
        } else {
          console.log('⚠️ [loadGastos] No se pudo hacer scroll - index:', index, 'flatListRef:', !!flatListRef.current);
        }
      } else {
        console.log('ℹ️ [loadGastos] No hay gasto para resaltar');
      }
    } catch (error) {
      console.error('❌ [loadGastos] Error loading gastos:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar los gastos. Verifica que el servidor esté corriendo.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('✅ [loadGastos] Carga de gastos finalizada');
    }
  };

  useEffect(() => {
    // Función para registrar y enviar el token
    const registerAndSendToken = async () => {
      try {
        console.log('🔄 Registrando notificaciones y enviando token...');
        await registerForPushNotificationsAsync();
        console.log('✅ Proceso de registro completado');
      } catch (error) {
        console.error('❌ Error al registrar notificaciones:', error);
        // No bloqueamos la app si falla el registro de notificaciones
      }
    };

    // Registrar y enviar token al iniciar la app
    registerAndSendToken();

    // Listen for notifications
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('🔔 [NotificationReceived] Notificación recibida!');
      console.log('🔔 [NotificationReceived] Notification completa:', JSON.stringify(notification, null, 2));
      
      // Extraer el estado y el ID del gasto de la notificación
      const notificationData = notification.request.content.data || {};
      const status = (typeof notificationData.status === 'string' ? notificationData.status.toLowerCase() : '') ||
                     (typeof notificationData.type === 'string' ? notificationData.type.toLowerCase() : '') ||
                     '';
      console.log('🔔 [NotificationReceived] Estado de la notificación:', status);
      
      // Extraer el ID del gasto de la notificación
      console.log('🔔 [NotificationReceived] Intentando extraer ID...');
      const gastoId = notificationData.gastoId || 
                      notificationData.id ||
                      extractIdFromNotification(notification);
      
      console.log('🔔 [NotificationReceived] ID extraído:', gastoId);
      console.log('🔔 [NotificationReceived] Estado:', status);
      
      // Manejar diferentes tipos de notificaciones: complete, decline, refund, reverse
      if (gastoId) {
        console.log('✅ [NotificationReceived] ID válido encontrado:', gastoId);
        console.log('✅ [NotificationReceived] Tipo de notificación:', status || 'desconocido');
        
        // Marcar el gasto de la notificación para resaltarlo
        setHighlightedExpenseId(String(gastoId));
        console.log('✅ [NotificationReceived] highlightedExpenseId actualizado a:', gastoId);
        
        // Verificar si el gasto ya está en la lista actual
        const currentGastos = gastosData?.gastos || [];
        const gastoExists = currentGastos.some(g => String(g.id) === String(gastoId));
        
        if (gastoExists) {
          console.log('✅ [NotificationReceived] El gasto ya está en la lista, resaltándolo directamente');
          // Si ya está en la lista, hacer scroll inmediatamente
          const index = currentGastos.findIndex(g => String(g.id) === String(gastoId));
          if (index !== -1 && flatListRef.current) {
            setTimeout(() => {
              try {
                flatListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.5 });
                console.log('✅ [NotificationReceived] Scroll completado');
              } catch (scrollError) {
                console.error('❌ [NotificationReceived] Error al hacer scroll:', scrollError);
              }
            }, 100);
          }
        } else {
          console.log('📥 [NotificationReceived] El gasto no está en la lista, recargando gastos...');
          loadGastos();
        }
        
        // Marcar que queremos navegar después de la animación
        setPendingNavigationId(String(gastoId));
        
        // Navegar después de que termine la animación completamente (800ms de animación + 200ms de margen)
        navigateTimeoutRef.current = setTimeout(() => {
          const gastos = gastosData?.gastos || [];
          const gasto = gastos.find(g => String(g.id) === String(gastoId));
          if (gasto) {
            console.log('🚀 [NotificationReceived] Navegando a pantalla de detalles del gasto (después de animación):', gastoId);
            navigation.navigate('ExpenseDetail', { gasto });
            setPendingNavigationId(null);
          } else {
            console.log('⏳ [NotificationReceived] Esperando a que se cargue el gasto para navegar...');
          }
        }, 7000); // 800ms animación + 200ms margen
        
        // Quitar el resaltado después de 7 segundos (para que la animación completa sea visible)
        setTimeout(() => {
          console.log('⏰ [NotificationReceived] Quitando resaltado después de 7 segundos');
          setHighlightedExpenseId(null);
        }, 7000);
      } else {
        console.log('❌ [NotificationReceived] No se pudo extraer ID de la notificación');
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      console.log('👆 [NotificationResponse] Usuario interactuó con la notificación!');
      console.log('👆 [NotificationResponse] Response completa:', JSON.stringify(response, null, 2));
      
      // Limpiar el badge cuando se pulsa una notificación
      try {
        await Notifications.setBadgeCountAsync(0);
        console.log('✅ [NotificationResponse] Badge limpiado');
      } catch (error) {
        console.error('❌ [NotificationResponse] Error al limpiar badge:', error);
      }
      
      // Extraer el estado y el ID del gasto de la notificación
      const notificationData = response.notification.request.content.data || {};
      const status = (typeof notificationData.status === 'string' ? notificationData.status.toLowerCase() : '') ||
                     (typeof notificationData.type === 'string' ? notificationData.type.toLowerCase() : '') ||
                     '';
      console.log('👆 [NotificationResponse] Estado de la notificación:', status);
      
      // Extraer el ID del gasto de la notificación
      console.log('👆 [NotificationResponse] Intentando extraer ID...');
      const gastoId = notificationData.gastoId || 
                      notificationData.id ||
                      extractIdFromNotification(response.notification);
      
      console.log('👆 [NotificationResponse] ID extraído:', gastoId);
      console.log('👆 [NotificationResponse] Estado:', status);
      
      // Manejar diferentes tipos de notificaciones: complete, decline, refund, reverse
      if (gastoId) {
        console.log('✅ [NotificationResponse] ID válido encontrado:', gastoId);
        console.log('✅ [NotificationResponse] Tipo de notificación:', status || 'desconocido');
        
        // Marcar el gasto de la notificación para resaltarlo
        setHighlightedExpenseId(String(gastoId));
        console.log('✅ [NotificationResponse] highlightedExpenseId actualizado a:', gastoId);
        
        // Verificar si el gasto ya está en la lista actual
        const currentGastos = gastosData?.gastos || [];
        const gastoExists = currentGastos.some(g => String(g.id) === String(gastoId));
        
        if (gastoExists) {
          console.log('✅ [NotificationResponse] El gasto ya está en la lista, resaltándolo directamente');
          // Si ya está en la lista, hacer scroll inmediatamente
          const index = currentGastos.findIndex(g => String(g.id) === String(gastoId));
          if (index !== -1 && flatListRef.current) {
            setTimeout(() => {
              try {
                flatListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.5 });
                console.log('✅ [NotificationResponse] Scroll completado');
              } catch (scrollError) {
                console.error('❌ [NotificationResponse] Error al hacer scroll:', scrollError);
              }
            }, 100);
          }
        } else {
          console.log('📥 [NotificationResponse] El gasto no está en la lista, recargando gastos...');
          loadGastos();
        }
        
        // Marcar que queremos navegar después de la animación
        setPendingNavigationId(String(gastoId));
        
        // Navegar después de que termine la animación completamente (800ms de animación + 200ms de margen)
        navigateTimeoutRef.current = setTimeout(() => {
          const gastos = gastosData?.gastos || [];
          const gasto = gastos.find(g => String(g.id) === String(gastoId));
          if (gasto) {
            console.log('🚀 [NotificationResponse] Navegando a pantalla de detalles del gasto (después de animación):', gastoId);
            navigation.navigate('ExpenseDetail', { gasto });
            setPendingNavigationId(null);
          } else {
            console.log('⏳ [NotificationResponse] Esperando a que se cargue el gasto para navegar...');
          }
        }, 1000); // 800ms animación + 200ms margen
        
        // Quitar el resaltado después de 7 segundos (para que la animación completa sea visible)
        setTimeout(() => {
          console.log('⏰ [NotificationResponse] Quitando resaltado después de 7 segundos');
          setHighlightedExpenseId(null);
        }, 7000);
      } else {
        console.log('❌ [NotificationResponse] No se pudo extraer ID de la notificación');
      }
    });

    // Listener para cuando la app vuelve al foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 App entró en primer plano, enviando token...');
        registerAndSendToken().catch((error) => {
          console.error('❌ Error al enviar token al volver al foreground:', error);
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    loadGastos();
  }, [month, year]);

  // Efecto para navegar cuando los gastos estén disponibles y haya una navegación pendiente
  useEffect(() => {
    if (pendingNavigationId && gastosData?.gastos) {
      const gasto = gastosData.gastos.find(g => String(g.id) === String(pendingNavigationId));
      if (gasto) {
        console.log('🚀 [HomeScreen] Navegando a pantalla de detalles del gasto (después de carga):', pendingNavigationId);
        // Pequeño delay para asegurar que la UI esté lista
        setTimeout(() => {
          navigation.navigate('ExpenseDetail', { gasto });
          setPendingNavigationId(null);
        }, 100);
      }
    }
  }, [pendingNavigationId, gastosData, navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGastos();
  };

  // Funciones para cambiar mes desde botones
  const handlePreviousMonth = useCallback(() => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  }, [month, year]);

  const handleNextMonth = useCallback(() => {
    const currentDate = new Date();
    const maxMonth = currentDate.getMonth() + 1;
    const maxYear = currentDate.getFullYear();

    if (year > maxYear || (year === maxYear && month >= maxMonth)) {
      return; // Don't allow future months
    }

    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  }, [month, year]);

  // Función para cambiar el mes (se ejecuta desde runOnJS en gestos)
  const changeMonth = useCallback((direction: 'left' | 'right') => {
    const currentMonth = monthRef.current;
    const currentYear = yearRef.current;
    
    if (direction === 'right') {
      // Swipe right - mes anterior
      if (currentMonth === 1) {
        setYear(currentYear - 1);
        setMonth(12);
      } else {
        setMonth(currentMonth - 1);
      }
    } else {
      // Swipe left - mes siguiente
      const currentDate = new Date();
      const maxMonth = currentDate.getMonth() + 1;
      const maxYear = currentDate.getFullYear();
      
      if (currentYear > maxYear || (currentYear === maxYear && currentMonth >= maxMonth)) {
        return; // Don't allow future months
      }
      
      if (currentMonth === 12) {
        setYear(currentYear + 1);
        setMonth(1);
      } else {
        setMonth(currentMonth + 1);
      }
    }
  }, []);

  // Función para animar el cambio de mes
  const animateMonthChange = useCallback((direction: 'left' | 'right') => {
    if (isAnimating.value) return;
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

  // Estilo animado
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  // Resetear animación cuando cambia el mes/año (desde botones)
  useEffect(() => {
    if (!isAnimating.value) {
      translateX.value = 0;
      opacity.value = 1;
    }
  }, [month, year]);

  // Solo contar los gastos aprobados (complete) - excluir rechazados, revertidos y reembolsos
  const totalSpent = gastosData?.gastos
    .filter(gasto => {
      const status = gasto.status?.toLowerCase() || '';
      // Incluir solo gastos completados/aprobados
      // Excluir: decline, rejected, reverse, refund
      return (gasto.approved !== false && 
              status !== 'rejected' && 
              status !== 'decline' && 
              status !== 'reverse' && 
              status !== 'refund') ||
             status === 'complete';
    })
    .reduce((sum, gasto) => sum + gasto.amount, 0) || 0;
  
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' 
    ? { background: '#111827', card: '#1f2937', text: '#f9fafb', textSecondary: '#9ca3af', border: '#374151', button: '#374151', error: '#ef4444' }
    : { background: '#f9fafb', card: '#ffffff', text: '#1f2937', textSecondary: '#6b7280', border: '#e5e7eb', button: '#f3f4f6', error: '#ef4444' };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <MonthSelector
        month={month}
        year={year}
        onPrevious={handlePreviousMonth}
        onNext={handleNextMonth}
      />
      {gastosData && (
        <BalanceCard
          totalSpent={totalSpent}
          companyBudget={COMPANY_BUDGET}
          payrollBudget={PAYROLL_BUDGET}
          month={month}
          year={year}
        />
      )}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.contentContainer, animatedStyle]}>
          <ExpensesList 
            gastos={gastosData?.gastos || []} 
            isLoading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            highlightedExpenseId={highlightedExpenseId}
            flatListRef={flatListRef}
          />
        </Animated.View>
      </GestureDetector>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
});

