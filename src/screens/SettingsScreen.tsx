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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { saveFactorialCookie } from '../services/api';
import { useTheme } from '../config/theme';

export const SettingsScreen: React.FC = () => {
  const [cookieValue, setCookieValue] = useState('');
  const [savingCookie, setSavingCookie] = useState(false);
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Configuración</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Cookie de Factorial</Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              Ingresa el cookie de autenticación de Factorial para sincronizar tus gastos
            </Text>
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
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity
              style={[
                styles.saveButton, 
                { backgroundColor: '#3b82f6' },
                savingCookie && styles.saveButtonDisabled
              ]}
              onPress={handleSaveCookie}
              disabled={savingCookie}
            >
              <Text style={styles.saveButtonText}>
                {savingCookie ? 'Guardando...' : 'Guardar Cookie'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Información</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Esta es una app personal para gestionar tus gastos de Factorial.
          </Text>
        </View>
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
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputGroup: {
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  saveButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

