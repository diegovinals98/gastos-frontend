import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
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
import { useHeaderHeight } from '@react-navigation/elements';
import { StatusBar } from 'expo-status-bar';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Gasto } from '../types';
import { useTheme } from '../config/theme';
import { spacing, radius, typography } from '../config/design';
import { SCREEN_BOTTOM_SPACE } from '../config/layout';
import { searchLocation } from '../services/location';
import { GlassSurface } from '../components/GlassSurface';

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
  const headerHeight = useHeaderHeight();

  const [gasto, setGasto] = useState<Gasto>(initialGasto);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [mapImageError, setMapImageError] = useState(false);

  const date = parseISO(gasto.date);
  const formattedDate = format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
  const formattedTime = format(date, 'HH:mm', { locale: es });
  const amount = Math.abs(gasto.amount);

  const status = gasto.status?.toLowerCase() || '';
  const isRejected = gasto.approved === false || status === 'rejected' || status === 'decline';
  const isRefunded = status === 'refund';
  const isReversed = status === 'reverse';
  const isComplete = status === 'complete';
  const isPending = !status || status === 'pending' || (!isRejected && !isRefunded && !isReversed && !isComplete);

  const getStatusInfo = () => {
    if (isRejected) return { label: 'Rechazado', color: theme.error, icon: 'close-circle' as const };
    if (isRefunded) return { label: 'Reembolso', color: theme.success, icon: 'arrow-undo-circle' as const };
    if (isReversed) return { label: 'Revertido', color: theme.warning, icon: 'refresh-circle' as const };
    if (isPending) return { label: 'Retenido', color: theme.textSecondary, icon: 'time' as const };
    return { label: 'Aprobado', color: theme.success, icon: 'checkmark-circle' as const };
  };

  const statusInfo = getStatusInfo();
  const amountColor = isRefunded ? theme.success : theme.error;
  const hasLocation = !!(gasto.latitude && gasto.longitude);

  useEffect(() => {
    const run = async () => {
      if (hasSearched || initialGasto.location || initialGasto.latitude) return;
      if (!initialGasto.merchant) {
        setHasSearched(true);
        return;
      }
      setIsSearchingLocation(true);
      try {
        const info = await searchLocation(initialGasto.merchant);
        if (info) {
          setGasto({
            ...initialGasto,
            location: info.location || initialGasto.location,
            address: info.address || initialGasto.address,
            city: info.city || initialGasto.city,
            country: info.country || initialGasto.country,
            latitude: info.latitude || initialGasto.latitude,
            longitude: info.longitude || initialGasto.longitude,
          });
        }
      } catch (e) {
        console.error('Error buscando ubicación:', e);
      } finally {
        setIsSearchingLocation(false);
        setHasSearched(true);
      }
    };
    run();
  }, [initialGasto.merchant, initialGasto.location, initialGasto.latitude]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'Detalle',
      headerTransparent: true,
      headerStyle: { backgroundColor: 'transparent' },
      headerBackground: () => (
        <GlassSurface glassStyle="regular" fallbackColor={theme.card} style={StyleSheet.absoluteFill} />
      ),
      headerTintColor: theme.text,
    });
  }, [navigation, theme]);

  const openMaps = () => {
    if (!hasLocation) return;
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${gasto.latitude},${gasto.longitude}&ll=${gasto.latitude},${gasto.longitude}`,
      android: `geo:${gasto.latitude},${gasto.longitude}?q=${gasto.latitude},${gasto.longitude}`,
    });
    if (url) {
      Linking.openURL(url).catch(() => {
        Linking.openURL(
          `https://maps.apple.com/?q=${gasto.latitude},${gasto.longitude}&ll=${gasto.latitude},${gasto.longitude}`,
        ).catch(console.error);
      });
    }
  };

  const Row = ({ label, value, last }: { label: string; value: string; last?: boolean }) => (
    <View>
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: theme.text }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {!last && <View style={[styles.separator, { backgroundColor: theme.separator }]} />}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={[styles.statusRing, { backgroundColor: `${statusInfo.color}1f` }]}>
            <Ionicons name={statusInfo.icon} size={34} color={statusInfo.color} />
          </View>
          <Text style={[styles.amount, { color: amountColor }]}>
            {isRefunded ? '+' : '−'}{amount.toFixed(2)}
            <Text style={styles.amountCurrency}> {gasto.currency}</Text>
          </Text>
          <Text style={[styles.merchant, { color: theme.text }]} numberOfLines={2}>
            {gasto.merchant}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: `${statusInfo.color}1f` }]}>
            <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
            <Text style={[styles.statusPillText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>

        {/* DETALLES */}
        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>DETALLES</Text>
        <View style={[styles.group, { backgroundColor: theme.cardElevated }]}>
          <Row label="Fecha" value={formattedDate} />
          <Row label="Hora" value={formattedTime} />
          <Row label="Moneda" value={gasto.currency} last />
        </View>

        {/* UBICACIÓN */}
        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>UBICACIÓN</Text>
        {isSearchingLocation && !hasLocation ? (
          <View style={[styles.stateBox, { backgroundColor: theme.cardElevated }]}>
            <ActivityIndicator color={theme.textSecondary} />
            <Text style={[styles.stateText, { color: theme.textSecondary }]}>Buscando ubicación…</Text>
          </View>
        ) : hasLocation ? (
          <TouchableOpacity style={styles.mapCard} activeOpacity={0.9} onPress={openMaps}>
            {!mapImageError ? (
              <Image
                source={{
                  uri: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ff0000(${gasto.longitude},${gasto.latitude})/${gasto.longitude},${gasto.latitude},14.5,0/700x360@2x?access_token=pk.eyJ1IjoiZHZpbmFsczk4IiwiYSI6ImNtOHd2ZWVibTB1amIybHNkdmN3NzZrNnkifQ.EFynoYmI5E_HGUAR2fjlcw`,
                }}
                style={styles.mapImage}
                resizeMode="cover"
                onError={() => setMapImageError(true)}
              />
            ) : (
              <View style={[styles.mapFallback, { backgroundColor: theme.inputBg }]}>
                <Ionicons name="location" size={48} color={theme.primary} />
                <Text style={[styles.mapFallbackText, { color: theme.text }]}>
                  {gasto.location || gasto.city || gasto.merchant || 'Ubicación'}
                </Text>
              </View>
            )}
            <View style={styles.mapButton}>
              <Ionicons name="map-outline" size={16} color="#ffffff" />
              <Text style={styles.mapButtonText}>Abrir en Apple Maps</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.stateBox, { backgroundColor: theme.cardElevated }]}>
            <Ionicons name="location-outline" size={28} color={theme.textTertiary} />
            <Text style={[styles.stateText, { color: theme.textSecondary }]}>
              Ubicación no disponible
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: SCREEN_BOTTOM_SPACE,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  statusRing: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  amount: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginBottom: spacing.xs,
  },
  amountCurrency: {
    fontSize: 24,
    fontWeight: '700',
  },
  merchant: {
    ...typography.title3,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  statusPillText: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Secciones / lista agrupada
  sectionLabel: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginLeft: spacing.xs,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  group: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  rowLabel: {
    ...typography.callout,
  },
  rowValue: {
    ...typography.callout,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg,
  },

  // Mapa
  mapCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    height: 200,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  mapFallbackText: {
    ...typography.headline,
  },
  mapButton: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.78)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  mapButtonText: {
    color: '#ffffff',
    ...typography.subhead,
    fontWeight: '600',
  },

  // Estados (cargando / sin ubicación)
  stateBox: {
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  stateText: {
    ...typography.subhead,
  },
});
