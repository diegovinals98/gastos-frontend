import { requireOptionalNativeModule } from 'expo-modules-core';

type WatchSyncModule = {
  updateSession(token: string, apiUrl: string): void;
};

// null en Android, web o builds sin el módulo nativo
const WatchSync = requireOptionalNativeModule<WatchSyncModule>('WatchSync');

// Manda el token y la URL del API a la app del Apple Watch; token vacío = sesión cerrada
export function updateWatchSession(token: string | null, apiUrl: string): void {
  WatchSync?.updateSession(token ?? '', apiUrl);
}
