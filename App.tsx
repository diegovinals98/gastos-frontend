import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  Alert,
  useColorScheme,
  View,
  Text,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { ExpenseDetailScreen } from './src/screens/ExpenseDetailScreen';
import { useTheme } from './src/config/theme';
import { Gasto } from './src/types';

const PASSWORD = '12092025';
const AUTH_STORAGE_KEY = '@factorial_auth';
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = checking, false = not authenticated, true = authenticated
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const colorScheme = useColorScheme();
  const theme = useTheme();

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

  // Si está verificando la autenticación, mostrar pantalla de carga
  if (isAuthenticated === null) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando...</Text>
        </View>
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
              Ingresa el código de acceso
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
              placeholder="Código de acceso"
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
                Código incorrecto
              </Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Si está autenticado, mostrar navegación
  return (
    <NavigationContainer>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            borderTopWidth: 1,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeStack}
          options={{
            tabBarLabel: 'Pagos',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="wallet-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Calendar" 
          component={CalendarScreen}
          options={{
            tabBarLabel: 'Calendario',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Ajustes',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
        
      </Tab.Navigator>
    </NavigationContainer>
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
    marginBottom: 32,
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
});
