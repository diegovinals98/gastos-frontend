import { GastosResponse, SpeedtestSummary, SpeedtestHistoryResponse } from '../types';
import { API_URL } from '../config/env';
import { getToken, removeToken, removeUser } from './auth';

// Helper function for authenticated requests
async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken();
  
  if (!token) {
    // Limpiar datos si no hay token para forzar login
    await removeToken();
    await removeUser();
    throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  console.log('🔑 URL:', `${API_URL}${url}`);
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  // Si el token expiró o es inválido
  if (response.status === 401) {
    // Limpiar token y usuario
    await removeToken();
    await removeUser();
    throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
  }

  return response;
}

export const fetchGastos = async (month: number, year: number): Promise<GastosResponse> => {
  try {
    const response = await authenticatedFetch(`/gastos?month=${month}&year=${year}`);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Error fetching gastos: ${response.statusText}`);
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
    const body = JSON.stringify({ token });
    
    console.log('📤 Enviando token de notificaciones push...');
    console.log('📍 URL:', `${API_URL}/notifications/token`);
    console.log('🔧 Método: POST');
    console.log('📦 Body:', body);
    console.log('🔑 Token:', token);
    
    const response = await authenticatedFetch('/notifications/token', {
      method: 'POST',
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

export interface GetTokensResponse {
  success: boolean;
  data?: string[];
  count?: number;
  message?: string;
}

export interface RegisterTokenResponse {
  success: boolean;
  message: string;
}

export interface UnregisterTokenResponse {
  success: boolean;
  message: string;
}

export const getPushTokens = async (): Promise<GetTokensResponse> => {
  try {
    const response = await authenticatedFetch('/notifications/token');
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: response.statusText,
        success: false
      }));
      throw new Error(error.message || `Error fetching push tokens: ${response.statusText}`);
    }
    
    const data: GetTokensResponse = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo tokens de push:', error);
    throw error;
  }
};

export const registerPushToken = async (token: string): Promise<RegisterTokenResponse> => {
  try {
    const body = JSON.stringify({ token });
    
    const response = await authenticatedFetch('/notifications/register-token', {
      method: 'POST',
      body,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: response.statusText,
        success: false
      }));
      throw new Error(error.message || `Error registering push token: ${response.statusText}`);
    }
    
    const data: RegisterTokenResponse = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error registrando token de push:', error);
    throw error;
  }
};

export const unregisterPushToken = async (token: string): Promise<UnregisterTokenResponse> => {
  try {
    const body = JSON.stringify({ token });
    
    const response = await authenticatedFetch('/notifications/unregister-token', {
      method: 'POST',
      body,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: response.statusText,
        success: false
      }));
      throw new Error(error.message || `Error unregistering push token: ${response.statusText}`);
    }
    
    const data: UnregisterTokenResponse = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error desregistrando token de push:', error);
    throw error;
  }
};

export const getFactorialCookie = async (): Promise<string | null> => {
  try {
    const response = await authenticatedFetch('/config/factorial-cookie');
    console.log('🔑 Cookie de Factorial:', response);
    if (!response.ok) {
      // Si no hay cookie configurada, el servidor puede devolver 404
      if (response.status === 404) {
        return null;
      }
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Error fetching factorial cookie: ${response.statusText}`);
    }
    
    const data = await response.json().catch(() => ({}));
    return data.cookie || null;
  } catch (error) {
    console.error('❌ Error obteniendo cookie de Factorial:', error);
    throw error;
  }
};

export const saveFactorialCookie = async (cookie: string): Promise<void> => {
  try {
    const body = JSON.stringify({ cookie });
    
    console.log('📤 Enviando cookie de Factorial...');
    console.log('📍 URL:', `${API_URL}/config/factorial-cookie`);
    console.log('🔧 Método: POST');
    
    const response = await authenticatedFetch('/config/factorial-cookie', {
      method: 'POST',
      body,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Error saving factorial cookie: ${response.statusText}`);
    }
    
    const responseData = await response.json().catch(() => ({}));
    console.log('✅ Cookie de Factorial guardada exitosamente');
    console.log('📄 Respuesta del servidor:', JSON.stringify(responseData, null, 2));
  } catch (error) {
    console.error('❌ Error guardando cookie de Factorial:', error);
    throw error;
  }
};

export interface TestCookieResponse {
  success: boolean;
  message: string;
  status: 'ok' | 'error';
  error?: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
  deletedTokens?: number;
}

export const logout = async (): Promise<LogoutResponse> => {
  try {
    const token = await getToken();
    
    if (!token) {
      // Si no hay token, ya estamos "deslogueados"
      return { success: true, message: 'No hay sesión activa' };
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: response.statusText,
        success: false
      }));
      throw new Error(error.message || `Error al cerrar sesión: ${response.statusText}`);
    }

    const data: LogoutResponse = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error en logout:', error);
    throw error;
  }
};

export const testCookie = async (): Promise<TestCookieResponse> => {
  try {
    const response = await authenticatedFetch('/config/test-cookie');
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: response.statusText,
        success: false,
        status: 'error'
      }));
      throw new Error(error.message || `Error testing cookie: ${response.statusText}`);
    }
    
    const data: TestCookieResponse = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error probando cookie:', error);
    throw error;
  }
};

export const getCardId = async (): Promise<string | null> => {
  try {
    const response = await authenticatedFetch('/config/card');
    
    if (!response.ok) {
      // Si no hay tarjeta configurada, el servidor puede devolver 404
      if (response.status === 404) {
        return null;
      }
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Error fetching card ID: ${response.statusText}`);
    }
    
    const data = await response.json().catch(() => ({}));
    return data.cardId || null;
  } catch (error) {
    console.error('❌ Error obteniendo número de tarjeta:', error);
    throw error;
  }
};

export const saveCardId = async (cardId: string): Promise<void> => {
  try {
    const body = JSON.stringify({ cardId });
    
    console.log('📤 Enviando número de tarjeta...');
    console.log('📍 URL:', `${API_URL}/config/card`);
    console.log('🔧 Método: POST');
    
    const response = await authenticatedFetch('/config/card', {
      method: 'POST',
      body,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Error saving card ID: ${response.statusText}`);
    }
    
    const responseData = await response.json().catch(() => ({}));
    console.log('✅ Número de tarjeta guardado exitosamente');
    console.log('📄 Respuesta del servidor:', JSON.stringify(responseData, null, 2));
  } catch (error) {
    console.error('❌ Error guardando número de tarjeta:', error);
    throw error;
  }
};

export const fetchSpeedtestSummary = async (): Promise<SpeedtestSummary> => {
  try {
    const response = await authenticatedFetch('/speedtest/summary');
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Error fetching speedtest summary: ${response.statusText}`);
    }
    
    const data: SpeedtestSummary = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching speedtest summary:', error);
    throw error;
  }
};

export const fetchSpeedtestHistory = async (page: number = 1, pageSize: number = 10): Promise<SpeedtestHistoryResponse> => {
  try {
    const response = await authenticatedFetch(`/speedtest/history?page=${page}&pageSize=${pageSize}`);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Error fetching speedtest history: ${response.statusText}`);
    }
    
    const data: SpeedtestHistoryResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching speedtest history:', error);
    throw error;
  }
};

