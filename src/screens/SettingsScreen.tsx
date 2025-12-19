import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  useColorScheme,
  View,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { saveFactorialCookie, getFactorialCookie, getCardId, saveCardId, testCookie, TestCookieResponse, getPushTokens, registerPushToken, unregisterPushToken } from '../services/api';
import { useTheme } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';

export const SettingsScreen: React.FC = () => {
  const [cookieValue, setCookieValue] = useState('');
  const [currentCookie, setCurrentCookie] = useState<string | null>(null);
  const [loadingCookie, setLoadingCookie] = useState(true);
  const [savingCookie, setSavingCookie] = useState(false);
  const [testingCookie, setTestingCookie] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [togglingNotifications, setTogglingNotifications] = useState(false);
  const [cardId, setCardId] = useState('');
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  const [loadingCardId, setLoadingCardId] = useState(true);
  const [savingCardId, setSavingCardId] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const { user, logout, checkAuthStatus } = useAuth();

  // Cargar número de tarjeta, cookie y estado de notificaciones al montar el componente
  useEffect(() => {
    loadCardId();
    loadCookie();
    loadNotificationsStatus();
  }, []);

  const loadCardId = async (showLoading: boolean = true) => {
    if (showLoading) {
      setLoadingCardId(true);
    }
    try {
      const id = await getCardId();
      setCurrentCardId(id);
      // No prellenar el input, solo mostrar el valor actual en el card
    } catch (error: any) {
      console.error('Error cargando número de tarjeta:', error);
      // Si no hay token, verificar estado de autenticación para redirigir a login
      if (error?.message?.includes('No hay token de autenticación') || error?.message?.includes('Sesión expirada')) {
        await checkAuthStatus();
      }
      // No mostrar error al usuario, solo dejar el campo vacío
    } finally {
      if (showLoading) {
        setLoadingCardId(false);
      }
    }
  };

  const loadCookie = async (showLoading: boolean = true) => {
    if (showLoading) {
      setLoadingCookie(true);
    }
    try {
      const cookie = await getFactorialCookie();
      setCurrentCookie(cookie);
      // No prellenar el input, solo mostrar el valor actual en el card
    } catch (error: any) {
      console.error('Error cargando cookie:', error);
      // Si no hay token, verificar estado de autenticación para redirigir a login
      if (error?.message?.includes('No hay token de autenticación') || error?.message?.includes('Sesión expirada')) {
        await checkAuthStatus();
      }
      // No mostrar error al usuario, solo dejar el campo vacío
    } finally {
      if (showLoading) {
        setLoadingCookie(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Recargar todos los datos en paralelo sin mostrar indicadores individuales
      await Promise.all([loadCardId(false), loadCookie(false), loadNotificationsStatus()]);
    } catch (error) {
      console.error('Error al refrescar datos:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveCookie = async () => {
    if (!cookieValue.trim()) {
      Alert.alert('Error', 'Por favor ingresa un valor para el cookie');
      return;
    }

    setSavingCookie(true);
    try {
      await saveFactorialCookie(cookieValue.trim());
      setCurrentCookie(cookieValue.trim());
      Alert.alert('Éxito', 'Cookie guardado correctamente');
    } catch (error: any) {
      console.error('Error guardando cookie:', error);
      // Si no hay token, verificar estado de autenticación para redirigir a login
      if (error?.message?.includes('No hay token de autenticación') || error?.message?.includes('Sesión expirada')) {
        await checkAuthStatus();
        return;
      }
      Alert.alert('Error', 'No se pudo guardar el cookie. Verifica que el servidor esté corriendo.');
    } finally {
      setSavingCookie(false);
    }
  };

  const handleTestCookie = async () => {
    setTestingCookie(true);
    try {
      const result: TestCookieResponse = await testCookie();
      
      if (result.success) {
        Alert.alert(
          '✅ Cookie Válida',
          result.message || 'Cookie válida - Conexión con Factorial funcionando correctamente',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '❌ Cookie Inválida',
          result.message || result.error || 'Cookie caducada o inválida',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Error probando cookie:', error);
      // Si no hay token, verificar estado de autenticación para redirigir a login
      if (error?.message?.includes('No hay token de autenticación') || error?.message?.includes('Sesión expirada')) {
        await checkAuthStatus();
        return;
      }
      Alert.alert(
        'Error',
        error.message || 'No se pudo probar el cookie. Verifica que el servidor esté corriendo.'
      );
    } finally {
      setTestingCookie(false);
    }
  };

  const loadNotificationsStatus = async () => {
    setLoadingNotifications(true);
    try {
      const result = await getPushTokens();
      // Si hay tokens registrados, las notificaciones están activadas
      const hasTokens = result.success && result.data && result.data.length > 0;
      setNotificationsEnabled(hasTokens || false);
    } catch (error: any) {
      console.error('Error cargando estado de notificaciones:', error);
      // Si no hay token, verificar estado de autenticación para redirigir a login
      if (error?.message?.includes('No hay token de autenticación') || error?.message?.includes('Sesión expirada')) {
        await checkAuthStatus();
      }
      setNotificationsEnabled(false);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const getExpoPushToken = async (): Promise<string | null> => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert('Permisos', 'Se necesitan permisos para notificaciones');
          return null;
        }
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenOptions = projectId && projectId !== 'your-project-id' 
        ? { projectId } 
        : undefined;
      
      const tokenData = await Notifications.getExpoPushTokenAsync(tokenOptions);
      return tokenData.data;
    } catch (error) {
      console.error('Error obteniendo token de Expo Push:', error);
      return null;
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    setTogglingNotifications(true);
    try {
      const expoToken = await getExpoPushToken();
      
      if (!expoToken) {
        Alert.alert('Error', 'No se pudo obtener el token de notificaciones');
        setTogglingNotifications(false);
        return;
      }

      if (value) {
        // Activar notificaciones - registrar token
        const result = await registerPushToken(expoToken);
        if (result.success) {
          setNotificationsEnabled(true);
        } else {
          Alert.alert('Error', result.message || 'No se pudo activar las notificaciones');
        }
      } else {
        // Desactivar notificaciones - desregistrar token
        const result = await unregisterPushToken(expoToken);
        if (result.success) {
          setNotificationsEnabled(false);
        } else {
          Alert.alert('Error', result.message || 'No se pudo desactivar las notificaciones');
        }
      }
    } catch (error: any) {
      console.error('Error cambiando estado de notificaciones:', error);
      // Si no hay token, verificar estado de autenticación para redirigir a login
      if (error?.message?.includes('No hay token de autenticación') || error?.message?.includes('Sesión expirada')) {
        await checkAuthStatus();
      } else {
        Alert.alert('Error', error.message || 'No se pudo cambiar el estado de las notificaciones');
      }
    } finally {
      setTogglingNotifications(false);
    }
  };

  const handleSaveCardId = async () => {
    if (!cardId.trim()) {
      Alert.alert('Error', 'Por favor ingresa un número de tarjeta');
      return;
    }

    setSavingCardId(true);
    try {
      await saveCardId(cardId.trim());
      setCurrentCardId(cardId.trim());
      Alert.alert('Éxito', 'Número de tarjeta guardado correctamente');
    } catch (error: any) {
      console.error('Error guardando número de tarjeta:', error);
      // Si no hay token, verificar estado de autenticación para redirigir a login
      if (error?.message?.includes('No hay token de autenticación') || error?.message?.includes('Sesión expirada')) {
        await checkAuthStatus();
        return;
      }
      Alert.alert('Error', 'No se pudo guardar el número de tarjeta. Verifica que el servidor esté corriendo.');
    } finally {
      setSavingCardId(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      Alert.alert('Error', 'No se pudo cerrar sesión correctamente');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colorScheme === 'dark' ? '#ffffff' : '#3b82f6'}
            colors={['#3b82f6']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Ajustes</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Configuración y preferencias
          </Text>
        </View>

        {/* User Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: theme.button }]}>
              <Ionicons name="person" size={20} color={theme.text} />
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Usuario</Text>
              <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                Información de tu cuenta
              </Text>
            </View>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.userInfoRow}>
              <Ionicons name="mail-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.userInfoText, { color: theme.text }]}>
                {user?.email || 'No disponible'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.logoutButton,
              { backgroundColor: theme.error, borderColor: theme.error }
            ]}
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.7}
          >
            {loggingOut ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color="#ffffff" />
                <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Card ID Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: theme.button }]}>
              <Ionicons name="card" size={20} color={theme.text} />
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Número de Tarjeta</Text>
              <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                Configura tu número de tarjeta
              </Text>
            </View>
          </View>

          {loadingCardId ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.text} size="small" />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Cargando...
              </Text>
            </View>
          ) : (
            <>
              {currentCardId && (
                <View style={[styles.infoCard, { backgroundColor: theme.background, borderColor: theme.border, marginBottom: 16 }]}>
                  <View style={styles.userInfoRow}>
                    <Ionicons name="card-outline" size={18} color={theme.textSecondary} />
                    <Text style={[styles.userInfoText, { color: theme.text }]}>
                      Tarjeta actual: {currentCardId}
                    </Text>
                  </View>
                </View>
              )}

              <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.input, { color: theme.text, minHeight: 50 }]}
                  placeholder="Ingresa el número de tarjeta"
                  placeholderTextColor={theme.textSecondary}
                  value={cardId}
                  onChangeText={setCardId}
                  keyboardType="numeric"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!savingCardId}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: '#3b82f6' },
                  (savingCardId || !cardId.trim()) && styles.buttonDisabled
                ]}
                onPress={handleSaveCardId}
                disabled={savingCardId || !cardId.trim()}
                activeOpacity={0.7}
              >
                {savingCardId ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Cookie Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: theme.button }]}>
              <Ionicons name="lock-closed" size={20} color={theme.text} />
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Autenticación</Text>
              <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                Cookie de Factorial
              </Text>
            </View>
          </View>

          {loadingCookie ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.text} size="small" />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Cargando...
              </Text>
            </View>
          ) : (
            <>
              {currentCookie && (
                <View style={[styles.infoCard, { backgroundColor: theme.background, borderColor: theme.border, marginBottom: 16 }]}>
                  <View style={styles.userInfoRow}>
                    <Ionicons name="lock-closed-outline" size={18} color={theme.textSecondary} />
                    <Text style={[styles.userInfoText, { color: theme.text }]} numberOfLines={2}>
                      Cookie actual: {currentCookie.length > 50 ? `${currentCookie.substring(0, 50)}...` : currentCookie}
                    </Text>
                  </View>
                </View>
              )}

              <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Pega aquí el cookie de autenticación"
                  placeholderTextColor={theme.textSecondary}
                  value={cookieValue}
                  onChangeText={setCookieValue}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                  numberOfLines={4}
                  editable={!savingCookie}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: '#3b82f6' },
                  (savingCookie || !cookieValue.trim()) && styles.buttonDisabled
                ]}
                onPress={handleSaveCookie}
                disabled={savingCookie || !cookieValue.trim()}
                activeOpacity={0.7}
              >
                {savingCookie ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { backgroundColor: theme.button, borderColor: theme.border, marginTop: 12, flexDirection: 'row' },
                  testingCookie && styles.buttonDisabled
                ]}
                onPress={handleTestCookie}
                disabled={testingCookie}
                activeOpacity={0.7}
              >
                {testingCookie ? (
                  <ActivityIndicator color={theme.text} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color={theme.text} style={{ marginRight: 8 }} />
                    <Text style={[styles.secondaryButtonText, { color: theme.text, marginBottom: 0 }]}>
                      Test Cookie
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Notifications Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: theme.button }]}>
              <Ionicons name="notifications" size={20} color={theme.text} />
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Notificaciones</Text>
              <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                Activa o desactiva las notificaciones push
              </Text>
            </View>
          </View>

          {loadingNotifications ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.text} size="small" />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Cargando...
              </Text>
            </View>
          ) : (
            <View style={styles.toggleContainer}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>
                    Notificaciones Push
                  </Text>
                  <Text style={[styles.toggleDescription, { color: theme.textSecondary }]}>
                    {notificationsEnabled 
                      ? 'Recibirás notificaciones sobre tus gastos' 
                      : 'No recibirás notificaciones push'}
                  </Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  disabled={togglingNotifications}
                  trackColor={{ false: theme.border, true: '#3b82f6' }}
                  thumbColor={notificationsEnabled ? '#ffffff' : theme.textSecondary}
                  ios_backgroundColor={theme.border}
                />
              </View>
              {togglingNotifications && (
                <View style={styles.toggleLoading}>
                  <ActivityIndicator color={theme.textSecondary} size="small" />
                  <Text style={[styles.toggleLoadingText, { color: theme.textSecondary }]}>
                    {notificationsEnabled ? 'Desactivando...' : 'Activando...'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: theme.button }]}>
              <Ionicons name="information-circle" size={20} color={theme.text} />
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Información</Text>
              <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                Acerca de la aplicación
              </Text>
            </View>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Aplicación personal para gestionar y visualizar tus gastos de Factorial.
            </Text>
          </View>
        </View>

        {/* Footer Spacing */}
        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '400',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  sectionDescription: {
    fontSize: 13,
    fontWeight: '400',
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  input: {
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  secondaryButtonSubtext: {
    fontSize: 12,
    fontWeight: '400',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userInfoText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  logoutButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  toggleContainer: {
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    fontWeight: '400',
  },
  toggleLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  toggleLoadingText: {
    fontSize: 13,
  },
  footer: {
    height: 20,
  },
});
