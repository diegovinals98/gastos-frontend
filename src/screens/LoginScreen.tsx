import React, { useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../config/theme';
import { spacing, radius, typography, cardShadow, controlHeight } from '../config/design';
import { Toast } from '../components/Toast';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('error');
  const { login } = useAuth();
  const colorScheme = useColorScheme();
  const theme = useTheme();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('Por favor completa todos los campos', 'error');
      return;
    }

    if (!validateEmail(email)) {
      showToast('Por favor ingresa un email válido', 'error');
      return;
    }

    setLoading(true);
    try {
      await login({ email: email.trim(), password });
    } catch (error: any) {
      showToast(error.message || 'Error al iniciar sesión', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
        duration={3000}
        type={toastType}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="lock-closed" size={30} color={theme.primary} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Bienvenido</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Inicia sesión para continuar
            </Text>
          </View>

          <View style={[styles.form, { backgroundColor: theme.cardElevated, shadowColor: theme.shadow }]}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg }]}>
                <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="usuario@ejemplo.com"
                  placeholderTextColor={theme.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Contraseña</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg }]}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Contraseña"
                  placeholderTextColor={theme.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  disabled={loading}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: theme.primary, shadowColor: theme.primary },
                loading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={theme.onPrimary} size="small" />
              ) : (
                <Text style={[styles.primaryButtonText, { color: theme.onPrimary }]}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                ¿No tienes una cuenta?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={loading} hitSlop={8}>
                <Text style={[styles.footerLink, { color: theme.primary }]}>Regístrate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.largeTitle,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.callout,
  },
  form: {
    padding: spacing.xxl,
    borderRadius: radius.xl,
    ...cardShadow,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.footnote,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: controlHeight,
  },
  inputIcon: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  eyeIcon: {
    padding: spacing.xs,
  },
  primaryButton: {
    height: controlHeight,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    ...typography.headline,
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  footerText: {
    ...typography.subhead,
    fontWeight: '400',
  },
  footerLink: {
    ...typography.subhead,
    fontWeight: '700',
  },
});
