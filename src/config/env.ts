import Constants from 'expo-constants';

// For development, you can override this in app.json extra field
// For production, use EAS Secrets or environment variables
const getApiUrl = () => {
  // Check if we have an override in app.json
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }
  
  // Default to localhost for development
  // In production, you should set this via EAS Secrets
  return __DEV__ ? 'http://localhost:3000' : 'https://your-api-url.com';
};

export const API_URL = getApiUrl();
export const COMPANY_BUDGET = 200; // Presupuesto que regala la empresa
export const PAYROLL_BUDGET = 20; // Presupuesto de nómina que se consume si se agota el de la empresa
export const MONTHLY_BUDGET = COMPANY_BUDGET + PAYROLL_BUDGET; // Total para compatibilidad

// Google Places API Key - puedes configurarlo en app.json extra.googlePlacesApiKey
const getGooglePlacesApiKey = () => {
  if (Constants.expoConfig?.extra?.googlePlacesApiKey) {
    return Constants.expoConfig.extra.googlePlacesApiKey;
  }
  return ''; // Necesitas agregar tu API key en app.json
};

export const GOOGLE_PLACES_API_KEY = getGooglePlacesApiKey();

