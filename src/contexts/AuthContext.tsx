import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { getToken, getUser, isTokenExpired, removeToken, removeUser } from '../services/auth';
import { login as loginService, register as registerService, logout as logoutService } from '../services/auth';
import { User, LoginCredentials, RegisterCredentials } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const userData = await getUser();
      
      if (!token || !userData) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      // Verificar si el token expiró
      if (isTokenExpired(token)) {
        // Token expirado, limpiar datos
        await removeToken();
        await removeUser();
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      // Token válido, usuario autenticado
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const data = await loginService(credentials);
      setUser(data.user);
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      const data = await registerService(credentials);
      setUser(data.user);
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      const success = await logoutService();
      // Solo actualizar estado si el logout fue exitoso
      if (success) {
        setUser(null);
        setIsAuthenticated(false);
      } else {
        throw new Error('Error al cerrar sesión en el servidor');
      }
    } catch (error) {
      console.error('Error in logout:', error);
      // No limpiar estado si el logout falló - mantener sesión activa
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

