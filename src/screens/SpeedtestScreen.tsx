import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../config/theme';
import { fetchSpeedtestSummary, fetchSpeedtestHistory } from '../services/api';
import { SpeedtestSummary, SpeedtestResult, SpeedtestHistoryResponse } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';

const { width } = Dimensions.get('window');

export const SpeedtestScreen: React.FC = () => {
  const [summary, setSummary] = useState<SpeedtestSummary | null>(null);
  const [history, setHistory] = useState<SpeedtestHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const pageSize = 10;
  const colorScheme = useColorScheme();
  const theme = useTheme();

  const loadSummary = async (showLoading: boolean = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const data = await fetchSpeedtestSummary();
      setSummary(data);
    } catch (error: any) {
      console.error('Error cargando resumen de speedtest:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  const loadHistory = async (page: number = 1) => {
    setLoadingHistory(true);
    try {
      const data = await fetchSpeedtestHistory(page, pageSize);
      setHistory(data);
      setCurrentPage(page);
    } catch (error: any) {
      console.error('Error cargando historial de speedtest:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadAll = async (showLoading: boolean = true) => {
    await Promise.all([loadSummary(showLoading), loadHistory(1)]);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll(false);
  };

  const formatSpeed = (speed: number): string => {
    if (speed >= 1000) {
      return `${(speed / 1000).toFixed(2)}`;
    }
    return speed.toFixed(1);
  };

  const formatSpeedUnit = (speed: number): string => {
    if (speed >= 1000) {
      return 'Gbps';
    }
    return 'Mbps';
  };

  const formatPing = (ping: number): string => {
    return `${ping.toFixed(0)}`;
  };

  const formatDate = (dateString: string): string => {
    try {
      if (!dateString) return '';
      
      let dateStr = dateString.trim();
      const originalStr = dateStr;
      
      // Si no tiene indicador de zona horaria, asumimos que es UTC
      if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        dateStr = dateStr + 'Z';
      }
      
      // Crear fecha desde string UTC - new Date() automáticamente convierte a hora local
      const localDate = new Date(dateStr);
      
      // Verificar que la fecha es válida
      if (isNaN(localDate.getTime())) {
        console.warn('Fecha inválida:', originalStr);
        return dateString;
      }
      
      // Debug: verificar la conversión
      const utcDate = new Date(dateStr);
      const utcHours = utcDate.getUTCHours();
      const localHours = localDate.getHours();
      const offset = localHours - utcHours;
      
      if (offset !== 0) {
        console.log(`📅 UTC: ${originalStr} → Local: ${format(localDate, "d 'de' MMMM, yyyy", { locale: es })} (offset: ${offset}h)`);
      }
      
      // Usar format de date-fns que respeta la zona horaria local del objeto Date
      return format(localDate, "d 'de' MMMM, yyyy", { locale: es });
    } catch (error) {
      console.error('Error formateando fecha:', error, dateString);
      return dateString;
    }
  };

  const formatTime = (dateString: string): string => {
    try {
      let dateStr = dateString.trim();
      const originalStr = dateStr;
      
      // Si no tiene indicador de zona horaria, asumimos que es UTC
      if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        dateStr = dateStr + 'Z';
      }
      
      // Crear fecha desde string UTC - new Date() automáticamente convierte a hora local
      // Cuando pasas un string con 'Z', JavaScript lo interpreta como UTC y lo convierte
      // automáticamente a la zona horaria local del dispositivo
      const localDate = new Date(dateStr);
      
      // Verificar que la fecha es válida
      if (isNaN(localDate.getTime())) {
        console.warn('Fecha inválida para formatear hora:', originalStr);
        return '';
      }
      
      // Debug: verificar la conversión
      const utcHours = localDate.getUTCHours();
      const localHours = localDate.getHours();
      const offset = localHours - utcHours;
      
      if (offset !== 0) {
        console.log(`🕐 UTC: ${originalStr} → Local: ${format(localDate, "HH:mm", { locale: es })} (offset: ${offset}h)`);
      }
      
      // format de date-fns usa la zona horaria local del objeto Date
      // Como el Date ya está en hora local (convertido automáticamente desde UTC),
      // format mostrará la hora local correcta
      return format(localDate, "HH:mm", { locale: es });
    } catch (error) {
      console.error('Error formateando hora:', error, dateString);
      return '';
    }
  };

  const getSpeedColor = (speed: number): string => {
    if (speed >= 100) return '#10b981'; // green-500
    if (speed >= 50) return '#3b82f6'; // blue-500
    if (speed >= 25) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const getPingColor = (ping: number): string => {
    if (ping < 20) return '#10b981';
    if (ping < 50) return '#3b82f6';
    if (ping < 100) return '#f59e0b';
    return '#ef4444';
  };

  const getSpeedPercentage = (speed: number, maxSpeed: number = 200): number => {
    return Math.min((speed / maxSpeed) * 100, 100);
  };

  const SpeedMetricCard = ({
    icon,
    label,
    value,
    unit,
    color,
    percentage,
  }: {
    icon: string;
    label: string;
    value: string;
    unit: string;
    color: string;
    percentage: number;
  }) => (
    <View style={[styles.speedMetricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.speedMetricHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon as any} size={28} color={color} />
        </View>
        <Text style={[styles.speedMetricLabel, { color: theme.textSecondary }]}>{label}</Text>
      </View>
      <View style={styles.speedValueContainer}>
        <Text style={[styles.speedValue, { color: color }]}>{value}</Text>
        <Text style={[styles.speedUnit, { color: theme.textSecondary }]}>{unit}</Text>
      </View>
      <View style={[styles.progressBarContainer, { backgroundColor: `${color}10` }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${percentage}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );

  const PingMetricCard = ({
    value,
    color,
  }: {
    value: string;
    color: string;
  }) => (
    <View style={[styles.pingMetricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.pingIconContainer, { backgroundColor: `${color}15` }]}>
        <Ionicons name="pulse" size={32} color={color} />
      </View>
      <Text style={[styles.pingLabel, { color: theme.textSecondary }]}>Latencia</Text>
      <View style={styles.pingValueContainer}>
        <Text style={[styles.pingValue, { color: color }]}>{value}</Text>
        <Text style={[styles.pingUnit, { color: theme.textSecondary }]}>ms</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Cargando estadísticas...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const maxSpeed = summary?.latest
    ? Math.max(summary.latest.downloadSpeed, summary.latest.uploadSpeed, 200)
    : 200;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIconContainer, { backgroundColor: '#3b82f620' }]}>
            <Ionicons name="speedometer" size={40} color="#3b82f6" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Speedtest</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Estadísticas de velocidad del servidor
          </Text>
        </View>

        {/* Latest Test - Main Metrics */}
        {summary?.latest && (
          <>
            <View style={styles.latestTestHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Última Prueba</Text>
                {summary.latest.timestamp && (
                  <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                    {formatDate(summary.latest.timestamp)} • {formatTime(summary.latest.timestamp)}
                  </Text>
                )}
              </View>
              {summary.latest.server && (
                <View style={[styles.serverBadge, { backgroundColor: '#3b82f615' }]}>
                  <Ionicons name="server" size={14} color="#3b82f6" />
                  <Text style={[styles.serverBadgeText, { color: '#3b82f6' }]}>
                    {summary.latest.server}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.mainMetricsContainer}>
              <SpeedMetricCard
                icon="download"
                label="Descarga"
                value={formatSpeed(summary.latest.downloadSpeed)}
                unit={formatSpeedUnit(summary.latest.downloadSpeed)}
                color={getSpeedColor(summary.latest.downloadSpeed)}
                percentage={getSpeedPercentage(summary.latest.downloadSpeed, maxSpeed)}
              />
              <SpeedMetricCard
                icon="arrow-up"
                label="Subida"
                value={formatSpeed(summary.latest.uploadSpeed)}
                unit={formatSpeedUnit(summary.latest.uploadSpeed)}
                color={getSpeedColor(summary.latest.uploadSpeed)}
                percentage={getSpeedPercentage(summary.latest.uploadSpeed, maxSpeed)}
              />
            </View>
          </>
        )}

        {/* Average Stats */}
        {summary?.average && (
          <View style={[styles.averageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.averageHeader}>
              <View style={[styles.averageIconContainer, { backgroundColor: '#3b82f615' }]}>
                <Ionicons name="stats-chart" size={24} color="#3b82f6" />
              </View>
              <View style={styles.averageHeaderText}>
                <Text style={[styles.averageTitle, { color: theme.text }]}>Promedio</Text>
                {summary.totalTests && (
                  <Text style={[styles.averageSubtitle, { color: theme.textSecondary }]}>
                    {summary.totalTests} prueba{summary.totalTests !== 1 ? 's' : ''} realizadas
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.averageMetrics}>
              <View style={styles.averageMetric}>
                <View style={styles.averageMetricHeader}>
                  <Ionicons name="download" size={18} color="#3b82f6" />
                  <Text style={[styles.averageMetricLabel, { color: theme.textSecondary }]}>
                    Descarga
                  </Text>
                </View>
                <Text style={[styles.averageMetricValue, { color: theme.text }]}>
                  {formatSpeed(summary.average.downloadSpeed)} {formatSpeedUnit(summary.average.downloadSpeed)}
                </Text>
              </View>

              <View style={[styles.averageMetricDivider, { backgroundColor: theme.border }]} />

              <View style={styles.averageMetric}>
                <View style={styles.averageMetricHeader}>
                  <Ionicons name="arrow-up" size={18} color="#3b82f6" />
                  <Text style={[styles.averageMetricLabel, { color: theme.textSecondary }]}>
                    Subida
                  </Text>
                </View>
                <Text style={[styles.averageMetricValue, { color: theme.text }]}>
                  {formatSpeed(summary.average.uploadSpeed)} {formatSpeedUnit(summary.average.uploadSpeed)}
                </Text>
              </View>

              <View style={[styles.averageMetricDivider, { backgroundColor: theme.border }]} />

              <View style={styles.averageMetric}>
                <View style={styles.averageMetricHeader}>
                  <Ionicons name="pulse" size={18} color="#3b82f6" />
                  <Text style={[styles.averageMetricLabel, { color: theme.textSecondary }]}>Ping</Text>
                </View>
                <Text style={[styles.averageMetricValue, { color: theme.text }]}>
                  {formatPing(summary.average.ping)} ms
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* History */}
        {history && history.results.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Ionicons name="time" size={20} color="#3b82f6" />
              <Text style={[styles.historyTitle, { color: theme.text }]}>Historial</Text>
            </View>

            {loadingHistory ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator size="small" color="#3b82f6" />
              </View>
            ) : (
              <>
                {history.results.map((result: SpeedtestResult, index: number) => (
              <View
                key={result.id ? `speedtest-${result.id}` : `speedtest-${result.timestamp}-${index}`}
                style={[
                  styles.historyItem,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.historyItemHeader}>
                  <View>
                    <Text style={[styles.historyDate, { color: theme.text }]}>
                      {formatDate(result.timestamp)}
                    </Text>
                    <Text style={[styles.historyTime, { color: theme.textSecondary }]}>
                      {formatTime(result.timestamp)}
                    </Text>
                  </View>
                  {result.server && (
                    <View style={[styles.historyServerBadge, { backgroundColor: theme.background }]}>
                      <Ionicons name="server" size={12} color={theme.textSecondary} />
                      <Text style={[styles.historyServerText, { color: theme.textSecondary }]}>
                        {result.server}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.historyMetrics}>
                  <View style={styles.historyMetric}>
                    <Ionicons
                      name="download"
                      size={16}
                      color={getSpeedColor(result.downloadSpeed)}
                    />
                    <Text style={[styles.historyMetricValue, { color: theme.text }]}>
                      {formatSpeed(result.downloadSpeed)}
                    </Text>
                    <Text style={[styles.historyMetricUnit, { color: theme.textSecondary }]}>
                      {formatSpeedUnit(result.downloadSpeed)}
                    </Text>
                  </View>

                  <View style={styles.historyMetric}>
                    <Ionicons name="arrow-up" size={16} color={getSpeedColor(result.uploadSpeed)} />
                    <Text style={[styles.historyMetricValue, { color: theme.text }]}>
                      {formatSpeed(result.uploadSpeed)}
                    </Text>
                    <Text style={[styles.historyMetricUnit, { color: theme.textSecondary }]}>
                      {formatSpeedUnit(result.uploadSpeed)}
                    </Text>
                  </View>

                  <View style={styles.historyMetric}>
                    <Ionicons name="pulse" size={16} color={getPingColor(result.ping)} />
                    <Text style={[styles.historyMetricValue, { color: theme.text }]}>
                      {formatPing(result.ping)}
                    </Text>
                    <Text style={[styles.historyMetricUnit, { color: theme.textSecondary }]}>ms</Text>
                  </View>
                </View>
              </View>
                ))}

                {/* Pagination Controls */}
                {history.pagination.totalPages > 1 && (
                  <View style={styles.paginationContainer}>
                    <View style={styles.paginationInfo}>
                      <Text style={[styles.paginationText, { color: theme.textSecondary }]}>
                        Página {history.pagination.page} de {history.pagination.totalPages}
                      </Text>
                    </View>
                    <View style={styles.paginationButtons}>
                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          { backgroundColor: theme.card, borderColor: theme.border },
                          currentPage === 1 && styles.paginationButtonDisabled,
                        ]}
                        onPress={() => currentPage > 1 && loadHistory(currentPage - 1)}
                        disabled={currentPage === 1 || loadingHistory}
                      >
                        <Ionicons
                          name="chevron-back"
                          size={20}
                          color={currentPage === 1 ? theme.textSecondary : '#3b82f6'}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          { backgroundColor: theme.card, borderColor: theme.border },
                          currentPage === history.pagination.totalPages && styles.paginationButtonDisabled,
                        ]}
                        onPress={() =>
                          currentPage < history.pagination.totalPages && loadHistory(currentPage + 1)
                        }
                        disabled={currentPage === history.pagination.totalPages || loadingHistory}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={
                            currentPage === history.pagination.totalPages ? theme.textSecondary : '#3b82f6'
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Empty State */}
        {!summary?.latest && !summary?.average && (!history || history.results.length === 0) && (
          <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.emptyIconContainer, { backgroundColor: '#3b82f610' }]}>
              <Ionicons name="speedometer-outline" size={48} color="#3b82f6" />
            </View>
            <Text style={[styles.emptyStateText, { color: theme.text }]}>
              No hay estadísticas disponibles
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
              Las estadísticas aparecerán aquí una vez que se realicen pruebas de velocidad
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '400',
  },
  latestTestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '400',
  },
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  serverBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mainMetricsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  speedMetricCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  speedMetricHeader: {
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  speedMetricLabel: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  speedValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  speedValue: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  speedUnit: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 6,
    marginBottom: 4,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  pingMetricCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  pingIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  pingLabel: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  pingValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pingValue: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
  },
  pingUnit: {
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 6,
    marginBottom: 4,
  },
  averageCard: {
    borderRadius: 20,
    padding: 24,
    marginTop: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  averageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  averageIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  averageHeaderText: {
    flex: 1,
  },
  averageTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  averageSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '400',
  },
  averageMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  averageMetric: {
    flex: 1,
    alignItems: 'center',
  },
  averageMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  averageMetricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  averageMetricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  averageMetricDivider: {
    width: 1,
    marginHorizontal: 8,
  },
  historySection: {
    marginTop: 32,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  historyItem: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '600',
  },
  historyTime: {
    fontSize: 12,
    marginTop: 2,
  },
  historyServerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  historyServerText: {
    fontSize: 10,
    fontWeight: '500',
  },
  historyMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  historyMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyMetricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  historyMetricUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  historyLoading: {
    padding: 20,
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  paginationInfo: {
    flex: 1,
  },
  paginationText: {
    fontSize: 13,
    fontWeight: '500',
  },
  paginationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  paginationButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
});
