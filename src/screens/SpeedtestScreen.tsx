import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  Text,
  View,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../config/theme';
import { SCREEN_BOTTOM_SPACE } from '../config/layout';
import { fetchSpeedtestSummary, fetchSpeedtestHistory } from '../services/api';
import { SpeedtestSummary, SpeedtestResult, SpeedtestHistoryResponse } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

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
      if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        dateStr = dateStr + 'Z';
      }
      const localDate = new Date(dateStr);
      if (isNaN(localDate.getTime())) {
        return dateString;
      }
      return format(localDate, "d 'de' MMMM, yyyy", { locale: es });
    } catch (error) {
      return dateString;
    }
  };

  const formatTime = (dateString: string): string => {
    try {
      let dateStr = dateString.trim();
      if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        dateStr = dateStr + 'Z';
      }
      const localDate = new Date(dateStr);
      if (isNaN(localDate.getTime())) {
        return '';
      }
      return format(localDate, "HH:mm", { locale: es });
    } catch (error) {
      return '';
    }
  };

  const getSpeedColor = (speed: number): string => {
    if (speed >= 100) return theme.success;
    if (speed >= 50) return '#007AFF';
    if (speed >= 25) return theme.warning;
    return theme.error;
  };

  const getPingColor = (ping: number): string => {
    if (ping < 20) return theme.success;
    if (ping < 50) return '#007AFF';
    if (ping < 100) return theme.warning;
    return theme.error;
  };

  // Skeleton Components
  const SkeletonCard = () => (
    <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
      <View style={[styles.skeletonLine, { backgroundColor: theme.skeleton }]} />
      <View style={[styles.skeletonLine, { backgroundColor: theme.skeleton, width: '60%', marginTop: 12 }]} />
      <View style={[styles.skeletonLine, { backgroundColor: theme.skeleton, width: '40%', marginTop: 8 }]} />
    </View>
  );

  const SkeletonMetric = () => (
    <View style={[styles.metricCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
      <View style={[styles.skeletonCircle, { backgroundColor: theme.skeleton }]} />
      <View style={[styles.skeletonLine, { backgroundColor: theme.skeleton, width: '70%', marginTop: 12 }]} />
      <View style={[styles.skeletonLine, { backgroundColor: theme.skeleton, width: '50%', marginTop: 8 }]} />
    </View>
  );

  // History Item with Gesture Animation
  const HistoryItem = ({ result, index }: { result: SpeedtestResult; index: number }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    const handlePressIn = () => {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(0.8, { duration: 100 });
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    };

    const handlePressOut = () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 100 });
    };

    const gesture = Gesture.Tap()
      .onBegin(() => {
        runOnJS(handlePressIn)();
      })
      .onFinalize(() => {
        runOnJS(handlePressOut)();
      });

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            styles.historyItem,
            { backgroundColor: theme.card, shadowColor: theme.shadow },
            animatedStyle,
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
              <View style={[styles.serverBadge, { backgroundColor: theme.background }]}>
                <Ionicons name="server" size={12} color={theme.textSecondary} />
                <Text style={[styles.serverBadgeText, { color: theme.textSecondary }]}>
                  {result.server}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.historyMetrics}>
            <View style={styles.historyMetric}>
              <Ionicons name="download" size={16} color={getSpeedColor(result.downloadSpeed)} />
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
        </Animated.View>
      </GestureDetector>
    );
  };

  // Pagination Button with Animation
  const PaginationButton = ({
    icon,
    onPress,
    disabled,
  }: {
    icon: string;
    onPress: () => void;
    disabled: boolean;
  }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: disabled ? 0.5 : 1,
    }));

    const gesture = Gesture.Tap()
      .enabled(!disabled)
      .onBegin(() => {
        if (!disabled) {
          scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
          if (Platform.OS === 'ios') {
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      })
      .onFinalize(() => {
        if (!disabled) {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
          runOnJS(onPress)();
        }
      });

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            styles.paginationButton,
            { backgroundColor: theme.card, borderColor: theme.border },
            animatedStyle,
          ]}
        >
          <Ionicons
            name={icon as any}
            size={20}
            color={disabled ? theme.textSecondary : '#007AFF'}
          />
        </Animated.View>
      </GestureDetector>
    );
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={[styles.skeletonLine, { backgroundColor: theme.skeleton, width: 150, height: 32 }]} />
            </View>
          </View>

          <View style={styles.metricsRow}>
            <SkeletonMetric />
            <SkeletonMetric />
          </View>

          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const maxSpeed = summary?.latest
    ? Math.max(summary.latest.downloadSpeed, summary.latest.uploadSpeed, 200)
    : 200;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colorScheme === 'dark' ? '#ffffff' : '#007AFF'}
            colors={['#007AFF']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: theme.text }]}>Speedtest</Text>
          </View>
        </View>

        {/* Latest Test Metrics */}
        {summary?.latest && (
          <>
            <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="flash" size={24} color="#007AFF" />
                <View style={styles.cardHeaderText}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Última Prueba</Text>
                  {summary.latest.timestamp && (
                    <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                      {formatDate(summary.latest.timestamp)} • {formatTime(summary.latest.timestamp)}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={[styles.metricCard, { backgroundColor: theme.background }]}>
                  <Ionicons
                    name="download"
                    size={24}
                    color={getSpeedColor(summary.latest.downloadSpeed)}
                  />
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Descarga</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      { color: getSpeedColor(summary.latest.downloadSpeed) },
                    ]}
                  >
                    {formatSpeed(summary.latest.downloadSpeed)}
                  </Text>
                  <Text style={[styles.metricUnit, { color: theme.textSecondary }]}>
                    {formatSpeedUnit(summary.latest.downloadSpeed)}
                  </Text>
                </View>

                <View style={[styles.metricCard, { backgroundColor: theme.background }]}>
                  <Ionicons
                    name="arrow-up"
                    size={24}
                    color={getSpeedColor(summary.latest.uploadSpeed)}
                  />
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Subida</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      { color: getSpeedColor(summary.latest.uploadSpeed) },
                    ]}
                  >
                    {formatSpeed(summary.latest.uploadSpeed)}
                  </Text>
                  <Text style={[styles.metricUnit, { color: theme.textSecondary }]}>
                    {formatSpeedUnit(summary.latest.uploadSpeed)}
                  </Text>
                </View>

                <View style={[styles.metricCard, { backgroundColor: theme.background }]}>
                  <Ionicons name="pulse" size={24} color={getPingColor(summary.latest.ping)} />
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Ping</Text>
                  <Text style={[styles.metricValue, { color: getPingColor(summary.latest.ping) }]}>
                    {formatPing(summary.latest.ping)}
                  </Text>
                  <Text style={[styles.metricUnit, { color: theme.textSecondary }]}>ms</Text>
                </View>
              </View>
            </View>

            {/* Average Stats */}
            {summary?.average && (
              <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="stats-chart" size={24} color="#007AFF" />
                  <View style={styles.cardHeaderText}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Promedio</Text>
                    {summary.totalTests && (
                      <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                        {summary.totalTests} prueba{summary.totalTests !== 1 ? 's' : ''} realizadas
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.averageMetrics}>
                  <View style={styles.averageMetric}>
                    <Text style={[styles.averageMetricLabel, { color: theme.textSecondary }]}>
                      Descarga
                    </Text>
                    <Text style={[styles.averageMetricValue, { color: theme.text }]}>
                      {formatSpeed(summary.average.downloadSpeed)} {formatSpeedUnit(summary.average.downloadSpeed)}
                    </Text>
                  </View>

                  <View style={[styles.averageMetricDivider, { backgroundColor: theme.border }]} />

                  <View style={styles.averageMetric}>
                    <Text style={[styles.averageMetricLabel, { color: theme.textSecondary }]}>Subida</Text>
                    <Text style={[styles.averageMetricValue, { color: theme.text }]}>
                      {formatSpeed(summary.average.uploadSpeed)} {formatSpeedUnit(summary.average.uploadSpeed)}
                    </Text>
                  </View>

                  <View style={[styles.averageMetricDivider, { backgroundColor: theme.border }]} />

                  <View style={styles.averageMetric}>
                    <Text style={[styles.averageMetricLabel, { color: theme.textSecondary }]}>Ping</Text>
                    <Text style={[styles.averageMetricValue, { color: theme.text }]}>
                      {formatPing(summary.average.ping)} ms
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* History */}
        {history && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Ionicons name="time" size={20} color="#007AFF" />
              <Text style={[styles.historyTitle, { color: theme.text }]}>Historial</Text>
            </View>

            {loadingHistory ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator size="small" color="#007AFF" />
              </View>
            ) : history.results.length > 0 ? (
              <>
                {history.results.map((result, index) => (
                  <HistoryItem key={result.id || `speedtest-${result.timestamp}-${index}`} result={result} index={index} />
                ))}

                {/* Pagination */}
                {history.pagination.totalPages > 1 && (
                  <View style={styles.paginationContainer}>
                    <Text style={[styles.paginationText, { color: theme.textSecondary }]}>
                      Página {history.pagination.page} de {history.pagination.totalPages}
                    </Text>
                    <View style={styles.paginationButtons}>
                      <PaginationButton
                        icon="chevron-back"
                        onPress={() => currentPage > 1 && loadHistory(currentPage - 1)}
                        disabled={currentPage === 1 || loadingHistory}
                      />
                      <PaginationButton
                        icon="chevron-forward"
                        onPress={() =>
                          currentPage < history.pagination.totalPages && loadHistory(currentPage + 1)
                        }
                        disabled={currentPage === history.pagination.totalPages || loadingHistory}
                      />
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="speedometer-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyStateText, { color: theme.text }]}>
                  No hay historial disponible
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Empty State */}
        {!summary?.latest && !summary?.average && (!history || history.results.length === 0) && (
          <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="speedometer-outline" size={64} color={theme.textSecondary} />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SCREEN_BOTTOM_SPACE,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  card: {
    borderRadius: 18,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  metricUnit: {
    fontSize: 12,
    marginTop: 2,
  },
  averageMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  averageMetric: {
    flex: 1,
    alignItems: 'center',
  },
  averageMetricLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  averageMetricValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  averageMetricDivider: {
    width: 1,
    marginHorizontal: 8,
  },
  historySection: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  historyItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyTime: {
    fontSize: 12,
    marginTop: 2,
  },
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  serverBadgeText: {
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
    gap: 4,
  },
  historyMetricValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyMetricUnit: {
    fontSize: 11,
    fontWeight: '500',
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
  emptyState: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 24,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Skeleton styles
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  skeletonCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
  },
});
