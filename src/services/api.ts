import { GastosResponse } from '../types';
import { API_URL } from '../config/env';

export const fetchGastos = async (month: number, year: number): Promise<GastosResponse> => {
  try {
    const response = await fetch(`${API_URL}/gastos?month=${month}&year=${year}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching gastos: ${response.statusText}`);
    }
    
    const data: GastosResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching gastos:', error);
    throw error;
  }
};

export const savePushToken = async (token: string): Promise<void> => {
  try {
    const url = `${API_URL}/notifications/token`;
    const headers = {
      'Content-Type': 'application/json',
    };
    const body = JSON.stringify({ token });
    
    console.log('📤 Enviando token de notificaciones push...');
    console.log('📍 URL:', url);
    console.log('🔧 Método: POST');
    console.log('📋 Headers:', JSON.stringify(headers, null, 2));
    console.log('📦 Body:', body);
    console.log('🔑 Token:', token);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });
    
    console.log('📥 Respuesta recibida:');
    console.log('   Status:', response.status);
    console.log('   Status Text:', response.statusText);
    console.log('   Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en la respuesta:', errorText);
      throw new Error(`Error saving push token: ${response.statusText}`);
    }
    
    const responseData = await response.json().catch(() => ({}));
    console.log('✅ Push token guardado exitosamente');
    console.log('📄 Respuesta del servidor:', JSON.stringify(responseData, null, 2));
  } catch (error) {
    console.error('❌ Error guardando push token:', error);
    if (error instanceof Error) {
      console.error('   Mensaje:', error.message);
      console.error('   Stack:', error.stack);
    }
    // No lanzamos el error para que la app continúe funcionando
    // aunque falle el guardado del token
  }
};

