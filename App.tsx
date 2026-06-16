import React, { useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { ExpenseDetailScreen } from './src/screens/ExpenseDetailScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { SpeedtestScreen } from './src/screens/SpeedtestScreen';
import { RumiScreen } from './src/screens/RumiScreen';
import { useTheme } from './src/config/theme';
import { Gasto } from './src/types';

const Tab = createNativeBottomTabNavigator();
const Stack = createStackNavigator();
const AuthStack = createStackNavigator();

// Stack Navigator para la pantalla Home
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen 
        name="ExpenseDetail" 
        component={ExpenseDetailScreen}
        options={{
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}

// Auth Stack Navigator (Login/Register)
function AuthStackNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// Main App Content (inside AuthProvider)
function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const colorScheme = useColorScheme();
  const theme = useTheme();

  // Resetear badge de notificaciones cada vez que se entra en la app
  useEffect(() => {
    if (isAuthenticated) {
      Notifications.setBadgeCountAsync(0).catch((error) => {
        console.error('Error reseteando badge:', error);
      });
    }
  }, [isAuthenticated]);

  // Si está verificando la autenticación, mostrar pantalla de carga
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Un solo NavigationContainer para toda la app
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        {!isAuthenticated ? (
          <AuthStackNavigator />
        ) : (
          <Tab.Navigator
            // Tab bar NATIVA (UITabBarController). En iOS 26 el sistema le
            // aplica Liquid Glass automáticamente, con su cápsula de selección.
            tabBarActiveTintColor={theme.primary}
            tabBarInactiveTintColor={theme.textSecondary}
            translucent
            hapticFeedbackEnabled
          >
            <Tab.Screen
              name="Home"
              component={HomeStack}
              options={{
                tabBarLabel: 'Pagos',
                tabBarIcon: () => ({ sfSymbol: 'creditcard.fill' }),
              }}
            />
            <Tab.Screen
              name="Calendar"
              component={CalendarScreen}
              options={{
                tabBarLabel: 'Calendario',
                tabBarIcon: () => ({ sfSymbol: 'calendar' }),
              }}
            />
            <Tab.Screen
              name="Speedtest"
              component={SpeedtestScreen}
              options={{
                tabBarLabel: 'Speedtest',
                tabBarIcon: () => ({ sfSymbol: 'speedometer' }),
              }}
            />
            <Tab.Screen
              name="Rumi"
              component={RumiScreen}
              options={{
                tabBarLabel: 'RUMI',
                tabBarIcon: () => ({ sfSymbol: 'gamecontroller.fill' }),
              }}
            />
            <Tab.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                tabBarLabel: 'Ajustes',
                tabBarIcon: () => ({ sfSymbol: 'gearshape.fill' }),
              }}
            />
          </Tab.Navigator>
        )}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

// Main App Component with AuthProvider
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
});
