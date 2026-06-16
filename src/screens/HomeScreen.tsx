import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  AppState,
  AppStateStatus,
  useColorScheme,
  View,
  Text,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { Toast } from '../components/Toast';
import { fetchGastos } from '../services/api';
import { GastosResponse, Gasto } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerForPushNotificationsAsync,
} from '../services/notifications';
import { COMPANY_BUDGET, PAYROLL_BUDGET } from '../config/env';
import { useTheme } from '../config/theme';
import { spacing, typography } from '../config/design';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';

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
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('error');
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
  
  // Valor animado para la animación de rechazo
  const shakeX = useSharedValue(0);

  // Función auxiliar para obtener la clave de almacenamiento
  const getStorageKey = (month: number, year: number): string => {
    return `@gastos_${year}_${month}`;
  };

  // Función para guardar gastos en AsyncStorage
  const saveGastosToStorage = async (month: number, year: number, data: GastosResponse) => {
    try {
      const key = getStorageKey(month, year);
      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log('💾 [saveGastosToStorage] Gastos guardados para', month, year);
    } catch (error) {
      console.error('❌ [saveGastosToStorage] Error al guardar:', error);
    }
  };

  // Función para cargar gastos desde AsyncStorage
  const loadGastosFromStorage = async (month: number, year: number): Promise<GastosResponse | null> => {
    try {
      const key = getStorageKey(month, year);
      const storedData = await AsyncStorage.getItem(key);
      if (storedData) {
        const data = JSON.parse(storedData) as GastosResponse;
        console.log('📦 [loadGastosFromStorage] Gastos cargados desde storage para', month, year);
        return data;
      }
      return null;
    } catch (error) {
      console.error('❌ [loadGastosFromStorage] Error al cargar:', error);
      return null;
    }
  };

  // Función para verificar si ya se hizo la precarga inicial
  const hasInitialPreload = async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem('@gastos_initial_preload');
      return value === 'true';
    } catch (error) {
      console.error('❌ [hasInitialPreload] Error:', error);
      return false;
    }
  };

  // Función para marcar que se hizo la precarga inicial
  const markInitialPreload = async () => {
    try {
      await AsyncStorage.setItem('@gastos_initial_preload', 'true');
      console.log('✅ [markInitialPreload] Precarga inicial marcada');
    } catch (error) {
      console.error('❌ [markInitialPreload] Error:', error);
    }
  };

  // Función para precargar todos los meses (últimos 6 meses + mes actual)
  const preloadAllGastos = async () => {
    try {
      console.log('🚀 [preloadAllGastos] Iniciando precarga de todos los gastos...');
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      // Precargar los últimos 6 meses + el mes actual
      const monthsToPreload: Array<{ month: number; year: number }> = [];
      
      for (let i = 0; i <= 6; i++) {
        let month = currentMonth - i;
        let year = currentYear;
        
        // Ajustar si el mes es negativo
        while (month <= 0) {
          month += 12;
          year -= 1;
        }
        
        monthsToPreload.push({ month, year });
      }
      
      console.log('📅 [preloadAllGastos] Meses a precargar:', monthsToPreload);
      
      // Cargar todos los meses en paralelo
      const promises = monthsToPreload.map(async ({ month, year }) => {
        try {
          // Verificar si ya está en caché
          const cached = await loadGastosFromStorage(month, year);
          if (cached) {
            console.log(`✅ [preloadAllGastos] ${month}/${year} ya está en caché`);
            return;
          }
          
          // Cargar desde la API
          console.log(`📥 [preloadAllGastos] Cargando ${month}/${year} desde la API...`);
          const data = await fetchGastos(month, year);
          await saveGastosToStorage(month, year, data);
          console.log(`✅ [preloadAllGastos] ${month}/${year} cargado y guardado`);
        } catch (error) {
          console.error(`❌ [preloadAllGastos] Error al cargar ${month}/${year}:`, error);
        }
      });
      
      await Promise.all(promises);
      await markInitialPreload();
      console.log('✅ [preloadAllGastos] Precarga completada');
    } catch (error) {
      console.error('❌ [preloadAllGastos] Error en la precarga:', error);
    }
  };

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

  const loadGastos = async (forceRefresh: boolean = false) => {
    try {
      console.log('📥 [loadGastos] Iniciando carga de gastos...');
      console.log('📥 [loadGastos] Mes:', month, 'Año:', year);
      console.log('📥 [loadGastos] highlightedExpenseId actual:', highlightedExpenseId);
     
      setLoading(true);
      
      // Si no es un refresh forzado, intentar cargar desde storage primero
      if (!forceRefresh) {
        const cachedData = await loadGastosFromStorage(month, year);
        if (cachedData) {
          console.log('📦 [loadGastos] Mostrando datos en caché mientras se actualiza...');
          setGastosData(cachedData);
          setLoading(false); // Mostrar datos inmediatamente
          
          // Hacer scroll si hay un gasto resaltado
          if (highlightedExpenseId && cachedData?.gastos) {
            const index = cachedData.gastos.findIndex(g => String(g.id) === String(highlightedExpenseId));
            if (index !== -1 && flatListRef.current) {
              setTimeout(() => {
                try {
                  flatListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.5 });
                } catch (scrollError) {
                  console.error('❌ [loadGastos] Error al hacer scroll:', scrollError);
                }
              }, 100);
            }
          }
        }
      }
      
      // Siempre hacer la llamada a la API para obtener datos frescos
      const data = await fetchGastos(month, year);
      console.log('📥 [loadGastos] Gastos recibidos de la API:', data?.gastos?.length || 0);
      console.log('📥 [loadGastos] IDs de gastos:', data?.gastos?.map(g => g.id) || []);
      
      // Guardar en storage
      if (data) {
        await saveGastosToStorage(month, year, data);
      }
      
      // Actualizar con datos frescos
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
      
      // Si hay un error y no tenemos datos en caché, mostrar error
      if (!gastosData) {
        showToast('No se pudieron cargar los gastos. Verifica que el servidor esté corriendo.', 'error');
      } else {
        // Si tenemos datos en caché, solo mostrar un mensaje en consola
        console.log('⚠️ [loadGastos] Error al actualizar, usando datos en caché');
      }
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
      
      // Si el tipo es "speedtest", abrir la URL
      if (notificationData.type === 'speedtest' && notificationData.url) {
        console.log('🚀 [NotificationResponse] Tipo speedtest detectado, abriendo URL:', notificationData.url);
        try {
          const canOpen = await Linking.canOpenURL(notificationData.url as string);
          if (canOpen) {
            await Linking.openURL(notificationData.url as string);
            console.log('✅ [NotificationResponse] URL abierta exitosamente');
          } else {
            console.error('❌ [NotificationResponse] No se puede abrir la URL:', notificationData.url);
          }
        } catch (error) {
          console.error('❌ [NotificationResponse] Error al abrir URL:', error);
        }
        return; // No continuar con el procesamiento normal de la notificación
      }
      
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

  // Precargar todos los gastos la primera vez
  useEffect(() => {
    const checkAndPreload = async () => {
      const hasPreloaded = await hasInitialPreload();
      if (!hasPreloaded) {
        console.log('🔄 [HomeScreen] Primera carga, precargando todos los gastos...');
        // Precargar en segundo plano sin bloquear la UI
        preloadAllGastos();
      }
    };
    checkAndPreload();
  }, []);

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
    loadGastos(true); // Forzar refresh desde la API
  };

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
      
      // Si estamos en el mes actual, mostrar animación de rechazo
      if (currentYear === maxYear && currentMonth === maxMonth) {
        // Animación de shake (rechazo) desde el gesto
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
    
    // Verificar si estamos intentando ir al mes siguiente desde el mes actual
    const currentMonth = monthRef.current;
    const currentYear = yearRef.current;
    const currentDate = new Date();
    const maxMonth = currentDate.getMonth() + 1;
    const maxYear = currentDate.getFullYear();
    
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
  const handlePreviousMonth = useCallback(() => {
    // Swipe right = mes anterior
    animateMonthChange('right');
  }, [animateMonthChange]);

  const handleNextMonth = useCallback(() => {
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

  // Estilo animado para el shake del MonthSelector
  const shakeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeX.value }],
    };
  });

  // Verificar si estamos en el mes actual
  const isCurrentMonth = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    return year === currentYear && month === currentMonth;
  };

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
  const theme = useTheme();

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
        duration={3000}
        type={toastType}
      />
      <Animated.View style={shakeAnimatedStyle}>
        <MonthSelector
          month={month}
          year={year}
          onPrevious={handlePreviousMonth}
          onNext={handleNextMonth}
          isNextDisabled={isCurrentMonth()}
        />
      </Animated.View>
      {gastosData && (
        <BalanceCard
          totalSpent={totalSpent}
          companyBudget={COMPANY_BUDGET}
          payrollBudget={PAYROLL_BUDGET}
          month={month}
          year={year}
        />
      )}

      {gastosData && (
        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: theme.text }]}>Movimientos</Text>
          {!!gastosData.gastos?.length && (
            <View style={[styles.countBadge, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.countText, { color: theme.textSecondary }]}>
                {gastosData.gastos.length}
              </Text>
            </View>
          )}
        </View>
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
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  listTitle: {
    ...typography.title3,
  },
  countBadge: {
    minWidth: 24,
    height: 22,
    paddingHorizontal: spacing.sm,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    ...typography.caption,
    fontWeight: '700',
  },
});

