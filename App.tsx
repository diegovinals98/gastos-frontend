import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  Alert,
  AppState,
  AppStateStatus,
  useColorScheme,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BalanceCard } from './src/components/BalanceCard';
import { ExpensesList } from './src/components/ExpensesList';
import { MonthSelector } from './src/components/MonthSelector';
import { fetchGastos, saveFactorialCookie } from './src/services/api';
import { GastosResponse } from './src/types';
import {
  registerForPushNotificationsAsync,
} from './src/services/notifications';
import { COMPANY_BUDGET, PAYROLL_BUDGET } from './src/config/env';
import * as Notifications from 'expo-notifications';

const PASSWORD = '12092025';
const AUTH_STORAGE_KEY = '@factorial_auth';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = checking, false = not authenticated, true = authenticated
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [gastosData, setGastosData] = useState<GastosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [highlightedExpenseId, setHighlightedExpenseId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [cookieValue, setCookieValue] = useState('');
  const [savingCookie, setSavingCookie] = useState(false);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const flatListRef = useRef<any>(null);

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
              flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
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
      
      // Extraer el ID del gasto de la notificación
      console.log('🔔 [NotificationReceived] Intentando extraer ID...');
      const gastoId = notification.request.content.data?.gastoId || 
                      notification.request.content.data?.id ||
                      extractIdFromNotification(notification);
      
      console.log('🔔 [NotificationReceived] ID extraído:', gastoId);
      
      if (gastoId) {
        console.log('✅ [NotificationReceived] ID válido encontrado:', gastoId);
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
                flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
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
        
        // Quitar el resaltado después de 5 segundos
        setTimeout(() => {
          console.log('⏰ [NotificationReceived] Quitando resaltado después de 5 segundos');
          setHighlightedExpenseId(null);
        }, 5000);
      } else {
        console.log('❌ [NotificationReceived] No se pudo extraer ID de la notificación');
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 [NotificationResponse] Usuario interactuó con la notificación!');
      console.log('👆 [NotificationResponse] Response completa:', JSON.stringify(response, null, 2));
      
      // Extraer el ID del gasto de la notificación
      console.log('👆 [NotificationResponse] Intentando extraer ID...');
      const gastoId = response.notification.request.content.data?.gastoId || 
                      response.notification.request.content.data?.id ||
                      extractIdFromNotification(response.notification);
      
      console.log('👆 [NotificationResponse] ID extraído:', gastoId);
      
      if (gastoId) {
        console.log('✅ [NotificationResponse] ID válido encontrado:', gastoId);
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
                flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
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
        
        // Quitar el resaltado después de 5 segundos
        setTimeout(() => {
          console.log('⏰ [NotificationResponse] Quitando resaltado después de 5 segundos');
          setHighlightedExpenseId(null);
        }, 5000);
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
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    loadGastos();
  }, [month, year]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGastos();
  };

  const handlePreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    if (year > currentYear || (year === currentYear && month >= currentMonth)) {
      return; // Don't allow future months
    }

    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  // Solo contar los gastos aprobados (excluir los rechazados)
  const totalSpent = gastosData?.gastos
    .filter(gasto => gasto.approved !== false && gasto.status !== 'rejected')
    .reduce((sum, gasto) => sum + gasto.amount, 0) || 0;
  
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' 
    ? { background: '#111827', card: '#1f2937', text: '#f9fafb', textSecondary: '#9ca3af', border: '#374151', button: '#374151', error: '#ef4444' }
    : { background: '#f9fafb', card: '#ffffff', text: '#1f2937', textSecondary: '#6b7280', border: '#e5e7eb', button: '#f3f4f6', error: '#ef4444' };

  // Verificar autenticación guardada al iniciar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authStatus = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (authStatus === 'true') {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  // Autenticar automáticamente cuando se ingrese la contraseña correcta
  useEffect(() => {
    if (password.length === PASSWORD.length) {
      if (password === PASSWORD) {
        const authenticate = async () => {
          try {
            await AsyncStorage.setItem(AUTH_STORAGE_KEY, 'true');
            setIsAuthenticated(true);
            setPasswordError(false);
            setPassword('');
          } catch (error) {
            console.error('Error saving auth:', error);
            Alert.alert('Error', 'No se pudo guardar la autenticación');
          }
        };
        authenticate();
      } else {
        setPasswordError(true);
        setPassword('');
        Alert.alert('Contraseña incorrecta', 'La contraseña ingresada no es correcta');
      }
    }
  }, [password]);

  const handleSaveCookie = async () => {
    if (!cookieValue.trim()) {
      Alert.alert('Error', 'Por favor ingresa un valor para el cookie');
      return;
    }

    setSavingCookie(true);
    try {
      await saveFactorialCookie(cookieValue.trim());
      Alert.alert('Éxito', 'Cookie guardado correctamente');
      setCookieValue('');
      setShowSettings(false);
    } catch (error) {
      console.error('Error guardando cookie:', error);
      Alert.alert('Error', 'No se pudo guardar el cookie. Verifica que el servidor esté corriendo.');
    } finally {
      setSavingCookie(false);
    }
  };

  // Si está verificando la autenticación, mostrar pantalla en blanco
  if (isAuthenticated === null) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  // Si no está autenticado, mostrar pantalla de login
  if (!isAuthenticated) {

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.loginContainer}>
          <View style={[styles.loginCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.loginTitle, { color: theme.text }]}>Acceso</Text>
            <Text style={[styles.loginSubtitle, { color: theme.textSecondary }]}>
              Ingresa la contraseña para continuar
            </Text>
            <TextInput
              style={[
                styles.passwordInput,
                {
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: passwordError ? theme.error : theme.border,
                },
              ]}
              placeholder="Contraseña"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={(text) => {
                // Solo permitir números y limitar a 8 caracteres
                const numericText = text.replace(/[^0-9]/g, '').slice(0, PASSWORD.length);
                setPassword(numericText);
                setPasswordError(false);
              }}
              keyboardType="numeric"
              secureTextEntry={true}
              autoFocus={true}
              maxLength={PASSWORD.length}
            />
            {passwordError && (
              <Text style={[styles.errorText, { color: theme.error }]}>
                Contraseña incorrecta
              </Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
      <ExpensesList 
        gastos={gastosData?.gastos || []} 
        isLoading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        highlightedExpenseId={highlightedExpenseId}
        flatListRef={flatListRef}
      />
      <TouchableOpacity 
        style={[styles.settingsButton, { backgroundColor: theme.button }]}
        onPress={() => setShowSettings(true)}
      >
        <Text style={[styles.settingsButtonText, { color: theme.text }]}>Ajustes</Text>
      </TouchableOpacity>
      
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Ajustes</Text>
            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Cookie de Factorial</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background, 
                color: theme.text, 
                borderColor: theme.border 
              }]}
              placeholder="Ingresa el cookie"
              placeholderTextColor={theme.textSecondary}
              value={cookieValue}
              onChangeText={setCookieValue}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.button }]}
                onPress={() => {
                  setShowSettings(false);
                  setCookieValue('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: '#3b82f6' }]}
                onPress={handleSaveCookie}
                disabled={savingCookie}
              >
                <Text style={styles.saveButtonText}>
                  {savingCookie ? 'Guardando...' : 'Enviar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  settingsButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    // backgroundColor handled by theme
  },
  saveButton: {
    // backgroundColor: '#3b82f6'
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  loginSubtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  passwordInput: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 4,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  loginButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

