import React, { useState } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { saveFactorialCookie } from '../services/api';
import { useTheme } from '../config/theme';

export const SettingsScreen: React.FC = () => {
  const [cookieValue, setCookieValue] = useState('');
  const [savingCookie, setSavingCookie] = useState(false);
  const [resettingBadge, setResettingBadge] = useState(false);
  const colorScheme = useColorScheme();
  const theme = useTheme();

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
    } catch (error) {
      console.error('Error guardando cookie:', error);
      Alert.alert('Error', 'No se pudo guardar el cookie. Verifica que el servidor esté corriendo.');
    } finally {
      setSavingCookie(false);
    }
  };

  const handleResetBadge = async () => {
    setResettingBadge(true);
    try {
      await Notifications.setBadgeCountAsync(0);
      Alert.alert('Éxito', 'Badge de notificaciones reseteado');
    } catch (error) {
      console.error('Error reseteando badge:', error);
      Alert.alert('Error', 'No se pudo resetear el badge de notificaciones');
    } finally {
      setResettingBadge(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Ajustes</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Configuración y preferencias
          </Text>
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
                Gestiona las notificaciones
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { backgroundColor: theme.button, borderColor: theme.border }
            ]}
            onPress={handleResetBadge}
            disabled={resettingBadge}
            activeOpacity={0.7}
          >
            {resettingBadge ? (
              <ActivityIndicator color={theme.text} size="small" />
            ) : (
              <>
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                  Resetear Badge
                </Text>
                <Text style={[styles.secondaryButtonSubtext, { color: theme.textSecondary }]}>
                  Establece el contador a 0
                </Text>
              </>
            )}
          </TouchableOpacity>
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
  footer: {
    height: 20,
  },
});
