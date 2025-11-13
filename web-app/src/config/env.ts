// Configuración de la API
const getApiUrl = () => {
  // En desarrollo, usar localhost o la URL del backend
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || 'http://localhost:3000';
  }
  
  // En producción, usar la variable de entorno o la URL por defecto
  return import.meta.env.VITE_API_URL || 'https://gastos-rs.sofiaydiego.net';
};

export const API_URL = getApiUrl();
export const MONTHLY_BUDGET = 200;

