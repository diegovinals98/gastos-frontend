/**
 * Servicio para buscar ubicaciones usando Google Places API
 */
import { GOOGLE_PLACES_API_KEY } from '../config/env';

export interface GooglePlaceResult {
  formattedAddress: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  displayName?: {
    text: string;
  };
  id: string;
  types?: string[];
  addressComponents?: Array<{
    longText: string;
    shortText: string;
    types: string[];
  }>;
}

export interface GooglePlacesResponse {
  places: GooglePlaceResult[];
}

export interface LocationInfo {
  location?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Busca la ubicación de un lugar usando Google Places API (New)
 * @param query Nombre del lugar/merchant a buscar
 * @returns Información de ubicación o null si no se encuentra
 */
export async function searchLocation(query: string): Promise<LocationInfo | null> {
  const apiKey = GOOGLE_PLACES_API_KEY;
  try {
    if (!apiKey) {
      console.error('❌ Google Places API Key no configurada');
      return null;
    }

    console.log('🔍 Buscando ubicación con Google Places API (New) para:', query);
    
    // Nueva API de Google Places
    const url = 'https://places.googleapis.com/v1/places:searchText';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents,places.types',
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en la respuesta de Google Places:', response.status, errorText);
      return null;
    }

    const data: GooglePlacesResponse = await response.json();
    
    if (!data.places || data.places.length === 0) {
      console.log('⚠️ No se encontró ubicación para:', query);
      return null;
    }

    const result = data.places[0];
    
    if (!result.location) {
      console.log('⚠️ El lugar no tiene coordenadas:', query);
      return null;
    }

    const location = result.location;
    const addressComponents = result.addressComponents || [];
    
    // Extraer información de los componentes de dirección
    let city = '';
    let country = '';
    let streetNumber = '';
    let route = '';
    
    addressComponents.forEach(component => {
      const types = component.types || [];
      if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        city = component.longText || '';
      }
      if (types.includes('country')) {
        country = component.longText || '';
      }
      if (types.includes('street_number')) {
        streetNumber = component.longText || '';
      }
      if (types.includes('route')) {
        route = component.longText || '';
      }
    });
    
    // Construir dirección
    const addressParts: string[] = [];
    if (streetNumber && route) {
      addressParts.push(`${route} ${streetNumber}`);
    } else if (route) {
      addressParts.push(route);
    }
    
    // Construir ubicación completa
    const locationParts: string[] = [];
    if (city) locationParts.push(city);
    if (country) locationParts.push(country);
    const locationString = locationParts.join(', ');

    const locationInfo: LocationInfo = {
      location: locationString || result.formattedAddress || result.displayName?.text,
      address: addressParts.length > 0 ? addressParts.join(', ') : result.formattedAddress,
      city: city || undefined,
      country: country || undefined,
      latitude: location.latitude,
      longitude: location.longitude,
    };

    console.log('✅ Ubicación encontrada:', locationInfo);
    return locationInfo;
  } catch (error) {
    console.error('❌ Error buscando ubicación:', error);
    return null;
  }
}


