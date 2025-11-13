import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BalanceCard } from './src/components/BalanceCard';
import { ExpensesList } from './src/components/ExpensesList';
import { MonthSelector } from './src/components/MonthSelector';
import { fetchGastos } from './src/services/api';
import { GastosResponse } from './src/types';
import {
  registerForPushNotificationsAsync,
} from './src/services/notifications';
import { MONTHLY_BUDGET } from './src/config/env';
import * as Notifications from 'expo-notifications';

export default function App() {
  const [gastosData, setGastosData] = useState<GastosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

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
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
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

  const loadGastos = async () => {
    try {
      setLoading(true);
      const data = await fetchGastos(month, year);
      setGastosData(data);
    } catch (error) {
      console.error('Error loading gastos:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar los gastos. Verifica que el servidor esté corriendo.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  const totalSpent = gastosData?.gastos.reduce((sum, gasto) => sum + gasto.amount, 0) || 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <MonthSelector
        month={month}
        year={year}
        onPrevious={handlePreviousMonth}
        onNext={handleNextMonth}
      />
      {gastosData && (
        <BalanceCard
          totalSpent={totalSpent}
          monthlyBudget={MONTHLY_BUDGET}
          month={month}
          year={year}
        />
      )}
      <ExpensesList 
        gastos={gastosData?.gastos || []} 
        isLoading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});

