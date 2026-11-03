import { Platform } from 'react-native';
import { ExtensionStorage } from '@bacons/apple-targets';
import { API_URL } from '../config/env';
import { updateWatchSession } from '../../modules/watch-sync';

// Debe coincidir con app.json (ios.entitlements) y con targets/widget/SaldoWidget.swift
const APP_GROUP = 'group.com.factorial.gastos';

const storage = new ExtensionStorage(APP_GROUP);

// El widget y la app del Apple Watch llaman ellos mismos a GET /gastos/summary,
// así que solo necesitan el token y la URL
export function setWidgetToken(token: string | null): void {
  if (Platform.OS !== 'ios') return;
  try {
    updateWatchSession(token, API_URL);
  } catch (error) {
    console.error('Error enviando la sesión al Apple Watch:', error);
  }
  try {
    storage.set('apiUrl', API_URL);
    storage.set('token', token ?? undefined);
    if (!token) storage.set('summary', undefined);
    ExtensionStorage.reloadWidget();
  } catch (error) {
    console.error('Error actualizando el widget:', error);
  }
}

// Pide al sistema que el widget vuelva a cargar el resumen
export function reloadWidget(): void {
  if (Platform.OS !== 'ios') return;
  try {
    ExtensionStorage.reloadWidget();
  } catch (error) {
    console.error('Error recargando el widget:', error);
  }
}
