import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { savePushToken } from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  try {
    console.log('🔄 Iniciando registro de notificaciones...');
    let token;

    if (Platform.OS === 'android') {
      console.log('🔄 Configurando canal de notificaciones para Android...');
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      console.log('✅ Canal de notificaciones configurado');
    }

    console.log('🔄 Obteniendo permisos para notificaciones...');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    console.log('🔄 Status existente:', existingStatus);
    
    if (existingStatus !== 'granted') {
      console.log('🔄 Solicitando permisos...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('🔄 Status después de solicitar:', finalStatus);
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert('Permisos', 'No se pudieron obtener los permisos para notificaciones');
      console.error('❌ No se pudieron obtener los permisos para notificaciones');
      return;
    }
    
    console.log('🔄 Obteniendo token de Expo Push...');
    
    // Obtener project ID desde la configuración
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    console.log('🔄 Project ID:', projectId || 'No configurado');
    
    // Si hay project ID, usarlo; si no, Expo intentará obtenerlo automáticamente
    const tokenOptions = projectId && projectId !== 'your-project-id' 
      ? { projectId } 
      : undefined;
    
    const tokenData = await Notifications.getExpoPushTokenAsync(tokenOptions);
    token = tokenData.data;
    console.log('✅ Token obtenido:', token);

    // Guardar el token en el backend
    if (token) {
      console.log('🔄 Guardando token en el backend...');
      await savePushToken(token);
      console.log('✅ Token guardado en el backend exitosamente');
    } else {
      console.warn('⚠️ No se obtuvo token para guardar');
    }

    return token;
  } catch (error) {
    console.error('❌ Error en registerForPushNotificationsAsync:', error);
    if (error instanceof Error) {
      console.error('   Mensaje:', error.message);
      console.error('   Stack:', error.stack);
    }
    throw error;
  }
}

export async function sendNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null, // Send immediately
  });
}

