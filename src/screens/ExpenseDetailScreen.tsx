import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  View,
  Text,
  useColorScheme,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Gasto } from '../types';
import { useTheme } from '../config/theme';
import { searchLocation } from '../services/location';

type RootStackParamList = {
  ExpenseDetail: { gasto: Gasto };
};

type ExpenseDetailRouteProp = RouteProp<RootStackParamList, 'ExpenseDetail'>;
type ExpenseDetailNavigationProp = StackNavigationProp<RootStackParamList, 'ExpenseDetail'>;

export const ExpenseDetailScreen: React.FC = () => {
  const route = useRoute<ExpenseDetailRouteProp>();
  const navigation = useNavigation<ExpenseDetailNavigationProp>();
  const { gasto: initialGasto } = route.params;
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDarkMode = theme.background === '#111827';
  
  // Estado para el gasto con ubicación encontrada
  const [gasto, setGasto] = useState<Gasto>(initialGasto);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [mapImageError, setMapImageError] = useState(false);

  const date = parseISO(gasto.date);
  const formattedDate = format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  const formattedTime = format(date, "HH:mm", { locale: es });
  const amount = Math.abs(gasto.amount);

  // Determinar el estado del gasto
  const status = gasto.status?.toLowerCase() || '';
  const isRejected = gasto.approved === false || status === 'rejected' || status === 'decline';
  const isRefunded = status === 'refund';
  const isReversed = status === 'reverse';
  const isComplete = status === 'complete';
  const isPending = !status || status === 'pending' || (!isRejected && !isRefunded && !isReversed && !isComplete);

  const getStatusInfo = () => {
    if (isRejected) {
      return {
        label: 'Rechazado',
        color: theme.error,
        icon: 'close-circle' as const,
        bgColor: isDarkMode ? '#2a1f1f' : '#fef2f2',
      };
    }
    if (isRefunded) {
      return {
        label: 'Reembolso',
        color: '#10b981',
        icon: 'arrow-back-circle' as const,
        bgColor: isDarkMode ? '#1a2e1f' : '#f0fdf4',
      };
    }
    if (isReversed) {
      return {
        label: 'Revertido',
        color: '#f59e0b',
        icon: 'refresh-circle' as const,
        bgColor: isDarkMode ? '#2a241f' : '#fffbeb',
      };
    }
    if (isPending) {
      return {
        label: 'Pendiente',
        color: theme.textSecondary,
        icon: 'time-outline' as const,
        bgColor: theme.card,
      };
    }
    return {
      label: 'Aprobado',
      color: '#10b981',
      icon: 'checkmark-circle' as const,
      bgColor: isDarkMode ? '#1a2e1f' : '#f0fdf4',
    };
  };

  const statusInfo = getStatusInfo();

  // Búsqueda automática de ubicación al cargar la pantalla
  useEffect(() => {
    const searchLocationAutomatically = async () => {
      // Solo buscar si no hay ubicación y no se ha buscado antes
      if (hasSearched || (initialGasto.location || initialGasto.latitude)) {
        return;
      }

      if (!initialGasto.merchant) {
        setHasSearched(true);
        return;
      }

      setIsSearchingLocation(true);
      try {
        const locationInfo = await searchLocation(initialGasto.merchant);
        
        if (locationInfo) {
          // Actualizar el gasto con la información de ubicación encontrada
          setGasto({
            ...initialGasto,
            location: locationInfo.location || initialGasto.location,
            address: locationInfo.address || initialGasto.address,
            city: locationInfo.city || initialGasto.city,
            country: locationInfo.country || initialGasto.country,
            latitude: locationInfo.latitude || initialGasto.latitude,
            longitude: locationInfo.longitude || initialGasto.longitude,
          });
        }
      } catch (error) {
        console.error('Error buscando ubicación:', error);
      } finally {
        setIsSearchingLocation(false);
        setHasSearched(true);
      }
    };

    searchLocationAutomatically();
  }, [initialGasto.merchant, initialGasto.location, initialGasto.latitude]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'Detalle del Gasto',
      headerStyle: {
        backgroundColor: theme.card,
      },
      headerTintColor: theme.text,
    });
  }, [navigation, theme]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card principal con información del gasto */}
        <View style={[
          styles.mainCard,
          {
            backgroundColor: statusInfo.bgColor,
            borderColor: statusInfo.color,
            borderWidth: 2,
          }
        ]}>
          {/* Icono de estado */}
          <View style={[styles.iconContainer, { backgroundColor: `${statusInfo.color}15` }]}>
            <Ionicons name={statusInfo.icon} size={48} color={statusInfo.color} />
          </View>

          {/* Monto */}
          <Text style={[styles.amount, { color: isRefunded ? '#10b981' : theme.error }]}>
            {isRefunded ? '+' : '-'}{amount.toFixed(2)} {gasto.currency}
          </Text>

          {/* Merchant */}
          <Text style={[styles.merchant, { color: theme.text }]}>
            {gasto.merchant}
          </Text>

          {/* Badge de estado */}
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusInfo.label}</Text>
          </View>
        </View>

        {/* Mapa de Apple Maps */}
        {isSearchingLocation && !(gasto.latitude && gasto.longitude) ? (
          <View style={[styles.detailsCard, { backgroundColor: theme.card }]}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.textSecondary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Buscando ubicación...
              </Text>
            </View>
          </View>
        ) : (gasto.latitude && gasto.longitude) ? (
          <View style={styles.mapCard}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Ubicación</Text>
            <TouchableOpacity
              style={[styles.mapContainer, { backgroundColor: theme.background }]}
              activeOpacity={0.8}
              onPress={() => {
                const url = Platform.select({
                  ios: `maps://maps.apple.com/?q=${gasto.latitude},${gasto.longitude}&ll=${gasto.latitude},${gasto.longitude}`,
                  android: `geo:${gasto.latitude},${gasto.longitude}?q=${gasto.latitude},${gasto.longitude}`,
                });
                if (url) {
                  Linking.openURL(url).catch(() => {
                    // Si falla, intentar con URL web de Apple Maps
                    Linking.openURL(`https://maps.apple.com/?q=${gasto.latitude},${gasto.longitude}&ll=${gasto.latitude},${gasto.longitude}`).catch(console.error);
                  });
                }
              }}
            >
              {!mapImageError ? (
                <Image
                  source={{
                    uri: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ff0000(${gasto.longitude},${gasto.latitude})/${gasto.longitude},${gasto.latitude},15,0/600x300@2x?access_token=pk.eyJ1IjoiZHZpbmFsczk4IiwiYSI6ImNtOHd2ZWVibTB1amIybHNkdmN3NzZrNnkifQ.EFynoYmI5E_HGUAR2fjlcw`,
                  }}
                  style={styles.mapImage}
                  resizeMode="cover"
                  onError={() => {
                    console.log('Error cargando mapa estático, usando fallback');
                    setMapImageError(true);
                  }}
                  onLoad={() => {
                    console.log('Mapa cargado correctamente');
                    setMapImageError(false);
                  }}
                />
              ) : (
                <View style={styles.mapFallback}>
                  <Ionicons name="location" size={64} color="#007AFF" />
                  <Text style={[styles.mapFallbackText, { color: theme.text }]}>
                    {gasto.location || gasto.city || gasto.merchant || 'Ubicación'}
                  </Text>
                  <Text style={[styles.mapFallbackCoords, { color: theme.textSecondary }]}>
                    {gasto.latitude.toFixed(6)}, {gasto.longitude.toFixed(6)}
                  </Text>
                </View>
              )}
              {/* Overlay solo con el botón, sin cubrir el mapa */}
              <View style={styles.mapOverlay}>
                <View style={styles.mapHint}>
                  <Ionicons name="map-outline" size={18} color="#ffffff" />
                  <Text style={styles.mapHintText}>Abrir en Apple Maps</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.detailsCard, { backgroundColor: theme.card }]}>
            <View style={styles.noLocationContainer}>
              <Ionicons name="location-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.noLocationText, { color: theme.textSecondary }]}>
                No se pudo encontrar la ubicación
              </Text>
            </View>
          </View>
        )}

        {/* Información detallada */}
        <View style={[styles.detailsCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Información del Pago</Text>

          {/* Fecha */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconContainer, { backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' }]}>
              <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Fecha</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{formattedDate}</Text>
            </View>
          </View>

          {/* Hora */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconContainer, { backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' }]}>
              <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Hora</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{formattedTime}</Text>
            </View>
          </View>

          {/* ID del gasto */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconContainer, { backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' }]}>
              <Ionicons name="receipt-outline" size={20} color={theme.textSecondary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>ID de Transacción</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{gasto.id}</Text>
            </View>
          </View>

          {/* Estado */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconContainer, { backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' }]}>
              <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Estado</Text>
              <View style={[styles.statusBadgeSmall, { backgroundColor: statusInfo.color }]}>
                <Text style={styles.statusTextSmall}>{statusInfo.label}</Text>
              </View>
            </View>
          </View>

          {/* Moneda */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIconContainer, { backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' }]}>
              <Ionicons name="cash-outline" size={20} color={theme.textSecondary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Moneda</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{gasto.currency}</Text>
            </View>
          </View>

          {/* Aprobado */}
          {gasto.approved !== undefined && (
            <View style={styles.detailRow}>
              <View style={[styles.detailIconContainer, { backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' }]}>
                <Ionicons 
                  name={gasto.approved ? "checkmark-circle-outline" : "close-circle-outline"} 
                  size={20} 
                  color={gasto.approved ? '#10b981' : theme.error} 
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Aprobado</Text>
                <Text style={[
                  styles.detailValue, 
                  { color: gasto.approved ? '#10b981' : theme.error }
                ]}>
                  {gasto.approved ? 'Sí' : 'No'}
                </Text>
              </View>
            </View>
          )}
        </View>

        
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  mainCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  merchant: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailsCard: {
    borderRadius: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  noLocationContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noLocationText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  mapCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  mapContainer: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    height: 300,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  mapFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapFallbackText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  mapFallbackCoords: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    left: 12,
    alignItems: 'flex-end',
  },
  mapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  mapHintText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  openMapsButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  openMapsButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadgeSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusTextSmall: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

