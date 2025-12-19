import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/env';
import { LoginCredentials, RegisterCredentials, AuthResponse, User } from '../types';
import { logout as logoutAPI } from './api';

const TOKEN_KEY = '@auth_token';
const USER_KEY = '@user_data';

// Token Management
export async function saveToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token:', error);
    throw error;
  }
}

export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

export async function removeToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
  }
}

// User Management
export async function saveUser(user: User): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user:', error);
    throw error;
  }
}

export async function getUser(): Promise<User | null> {
  try {
    const userData = await AsyncStorage.getItem(USER_KEY);
    if (userData) {
      return JSON.parse(userData) as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function removeUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Error removing user:', error);
  }
}

// Clear all user data from storage (gastos, calendar, preload flags, etc.)
export async function clearAllUserData(): Promise<void> {
  try {
    // Get all keys from AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filter keys that are user-specific data
    const userDataKeys = allKeys.filter(key => 
      key.startsWith('@gastos_') || 
      key.startsWith('@calendar_gastos_') ||
      key === '@gastos_initial_preload'
    );
    
    // Remove all user data keys
    if (userDataKeys.length > 0) {
      await AsyncStorage.multiRemove(userDataKeys);
      console.log('✅ Cleared user data:', userDataKeys.length, 'items');
    }
  } catch (error) {
    console.error('Error clearing user data:', error);
    // Don't throw - we still want to continue with login/register even if cleanup fails
  }
}

// Token Utilities
export function decodeToken(token: string): any | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
}

// Auth Functions
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error al iniciar sesión' }));
      throw new Error(error.message || 'Credenciales inválidas');
    }

    const data: AuthResponse = await response.json();
    
    // Limpiar todos los datos del usuario anterior (incluyendo token y usuario antiguos)
    await removeToken();
    await removeUser();
    await clearAllUserData();
    
    // Guardar token y usuario nuevos
    await saveToken(data.access_token);
    await saveUser(data.user);
    
    return data;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
}

export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error al registrar' }));
      throw new Error(error.message || 'Error al registrar usuario');
    }

    const data: AuthResponse = await response.json();
    
    // Limpiar todos los datos del usuario anterior (incluyendo token y usuario antiguos)
    await removeToken();
    await removeUser();
    await clearAllUserData();
    
    // Guardar token y usuario nuevos
    await saveToken(data.access_token);
    await saveUser(data.user);
    
    return data;
  } catch (error) {
    console.error('Error en registro:', error);
    throw error;
  }
}

export async function logout(): Promise<boolean> {
  try {
    // Llamar al endpoint de logout
    const result = await logoutAPI();
    
    // Solo limpiar datos si el logout fue exitoso
    if (result.success) {
      // Limpiar todos los datos del usuario
      await clearAllUserData();
      await removeToken();
      await removeUser();
      return true;
    } else {
      // Si el logout falló, no limpiar datos localmente
      throw new Error(result.message || 'Error al cerrar sesión');
    }
  } catch (error) {
    console.error('Error en logout:', error);
    throw error;
  }
}

