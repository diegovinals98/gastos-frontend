import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  runOnJS,
  Layout,
} from 'react-native-reanimated';
import { useTheme } from '../config/theme';
import { SCREEN_BOTTOM_SPACE } from '../config/layout';
import { Toast } from '../components/Toast';
import * as Haptics from 'expo-haptics';
import { AudioPlayer, useAudioPlayer } from 'expo-audio';

// Componente de jugador con drag and drop - definido fuera para evitar recreación
interface DraggablePlayerCardProps {
  player: string;
  index: number;
  isActive: boolean;
  isRunning: boolean;
  totalPlayers: number;
  onRemove: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  theme: any;
}

const DraggablePlayerCardComponent: React.FC<DraggablePlayerCardProps> = ({ 
  player, 
  index, 
  isActive, 
  isRunning,
  totalPlayers,
  onRemove,
  onReorder,
  theme 
}) => {
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const dragOpacity = useSharedValue(1);
  const isDraggingShared = useSharedValue(0); // 0 = false, 1 = true
  const [isDraggingState, setIsDraggingState] = useState(false);
  const dragOverIndexRef = useRef<number | null>(null);

  const panGesture = Gesture.Pan()
    .enabled(!isRunning)
    .onStart(() => {
      isDraggingShared.value = 1;
      runOnJS(setIsDraggingState)(true);
      dragScale.value = withTiming(1.005, { duration: 1000 });
      dragOpacity.value = withTiming(0.98, { duration: 1000 });
    })
    .onUpdate((e) => {
      dragX.value = e.translationX;
      dragY.value = e.translationY;
      
      // Detectar sobre qué posición estamos arrastrando basado en translationY
      const itemHeight = 92;
      const threshold = itemHeight * 0.4;
      
      // Calcular el nuevo índice basado en cuánto nos hemos movido
      let newDragOverIndex = index;
      if (e.translationY < -threshold && index > 0) {
        newDragOverIndex = index - 1;
      } else if (e.translationY > threshold && index < totalPlayers - 1) {
        newDragOverIndex = index + 1;
      }
      
      // Solo actualizar si cambió
      if (newDragOverIndex !== dragOverIndexRef.current && newDragOverIndex !== index) {
        dragOverIndexRef.current = newDragOverIndex;
      } else if (newDragOverIndex === index) {
        dragOverIndexRef.current = null;
      }
    })
    .onEnd(() => {
      const finalDragOver = dragOverIndexRef.current;
      
      // Resetear animaciones primero
      dragX.value = withTiming(0, { duration: 200 });
      dragY.value = withTiming(0, { duration: 200 });
      dragScale.value = withTiming(1, { duration: 200 });
      dragOpacity.value = withTiming(1, { duration: 200 });
      isDraggingShared.value = 0;
      
      // Luego reordenar si es necesario
      if (finalDragOver !== null && finalDragOver !== index && finalDragOver >= 0 && finalDragOver < totalPlayers) {
        runOnJS(onReorder)(index, finalDragOver);
      }
      
      runOnJS(setIsDraggingState)(false);
      dragOverIndexRef.current = null;
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: dragX.value },
        { translateY: dragY.value },
        { scale: dragScale.value },
      ],
      opacity: dragOpacity.value,
      zIndex: isDraggingShared.value === 1 ? 1000 : 1,
    };
  });

  const borderAnimatedStyle = useAnimatedStyle(() => {
    return {
      borderColor: isDraggingShared.value === 1 ? '#3b82f6' : (isActive && isRunning ? '#3b82f6' : theme.border),
      borderWidth: (isDraggingShared.value === 1 || (isActive && isRunning)) ? 2 : 1,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.playerCard,
          {
            backgroundColor: theme.background,
          },
          animatedStyle,
          borderAnimatedStyle,
        ]}
      >
        <View style={styles.playerCardContent}>
          {isActive && isRunning && (
            <View style={[styles.activeIndicator, { backgroundColor: '#3b82f6' }]} />
          )}
          {!isRunning && (
            <Ionicons 
              name="reorder-three" 
              size={20} 
              color={isDraggingState ? '#3b82f6' : theme.textSecondary} 
              style={{ marginRight: 8, opacity: isDraggingState ? 1 : 0.5 }} 
            />
          )}
          <Text
            style={[
              styles.playerName,
              {
                color: isActive && isRunning
                  ? '#3b82f6'
                  : theme.text,
                fontWeight: isActive && isRunning ? '600' : '400',
              },
            ]}
          >
            {player}
          </Text>
          {isActive && isRunning && (
            <Text style={[styles.activeLabel, { color: '#3b82f6' }]}>TURNO</Text>
          )}
        </View>
        {!isRunning && (
          <TouchableOpacity
            onPress={onRemove}
            style={styles.removeButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color={theme.error} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

const DraggablePlayerCard = React.memo(DraggablePlayerCardComponent, (prevProps, nextProps) => {
  // Comparación personalizada para evitar re-renders innecesarios
  return (
    prevProps.player === nextProps.player &&
    prevProps.index === nextProps.index &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isRunning === nextProps.isRunning &&
    prevProps.totalPlayers === nextProps.totalPlayers
  );
});

export const RumiScreen: React.FC = () => {
  const [players, setPlayers] = useState<string[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [timePerTurn, setTimePerTurn] = useState(60); // segundos por defecto
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('error');
  const [timeConfigInput, setTimeConfigInput] = useState('60');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Animaciones
  const playerNameScale = useSharedValue(1);
  const playerNameOpacity = useSharedValue(1);

  const colorScheme = useColorScheme();
  const theme = useTheme();

  // Audio players para tick y alarma usando expo-audio
  const tickPlayer = useAudioPlayer();
  const alarmPlayer = useAudioPlayer();

  // Función para reproducir sonido tick (beep corto)
  const playTickSound = useCallback(async () => {
    try {
      // Haptic ligero para el tick
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Intentar reproducir sonido usando expo-audio
      // Nota: Para reproducir sonidos reales, necesitaríamos archivos de audio
      // Por ahora usamos haptics que es más confiable y funciona en todas las plataformas
    } catch (error) {
      console.log('No se pudo reproducir tick sound');
    }
  }, []);

  // Función para reproducir alarma cuando el tiempo termine
  const playAlarmSound = useCallback(async () => {
    try {
      // Haptic fuerte múltiple para simular alarma
      for (let i = 0; i < 5; i++) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        if (i < 4) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }
      
      // Intentar reproducir alarma usando expo-audio
      // Nota: Para reproducir sonidos reales, necesitaríamos archivos de audio
      // Por ahora usamos haptics que es más confiable y funciona en todas las plataformas
    } catch (error) {
      // Fallback: intentar haptic básico
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (hapticsError) {
        console.log('No se pudo reproducir haptics');
      }
    }
  }, [tickPlayer, alarmPlayer]);

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const addPlayer = () => {
    const trimmedName = newPlayerName.trim();
    if (!trimmedName) {
      showToast('Por favor ingresa un nombre', 'error');
      return;
    }
    if (players.includes(trimmedName)) {
      showToast('Este jugador ya existe', 'error');
      return;
    }
    setPlayers([...players, trimmedName]);
    setNewPlayerName('');
    showToast(`Jugador "${trimmedName}" agregado`, 'success');
  };

  const removePlayer = (index: number) => {
    const newPlayers = players.filter((_, i) => i !== index);
    setPlayers(newPlayers);
    if (currentPlayerIndex >= newPlayers.length && newPlayers.length > 0) {
      setCurrentPlayerIndex(0);
    }
    if (newPlayers.length === 0) {
      setIsRunning(false);
      setIsPaused(false);
      setCurrentPlayerIndex(0);
    }
  };

  const reorderPlayers = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    setPlayers((prevPlayers) => {
      const newPlayers = [...prevPlayers];
      const [movedPlayer] = newPlayers.splice(fromIndex, 1);
      newPlayers.splice(toIndex, 0, movedPlayer);
      
      // Ajustar índice del jugador actual si es necesario
      setCurrentPlayerIndex((prevCurrent) => {
        if (prevCurrent === fromIndex) {
          return toIndex;
        } else if (prevCurrent > fromIndex && prevCurrent <= toIndex) {
          return prevCurrent - 1;
        } else if (prevCurrent < fromIndex && prevCurrent >= toIndex) {
          return prevCurrent + 1;
        }
        return prevCurrent;
      });
      
      return newPlayers;
    });
  }, []);

  const handleTimeConfigChange = (value: string) => {
    setTimeConfigInput(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setTimePerTurn(numValue);
      if (!isRunning) {
        setTimeRemaining(numValue);
      }
    }
  };

  const startGame = () => {
    if (players.length < 2) {
      showToast('Necesitas al menos 2 jugadores', 'error');
      return;
    }
    setIsRunning(true);
    setIsPaused(false);
    setCurrentPlayerIndex(0);
    setTimeRemaining(timePerTurn);
    
    // Animaciones al iniciar
    playerNameScale.value = withTiming(1.01, { duration: 300 });
    playerNameOpacity.value = withTiming(1, { duration: 300 });
    
    showToast('¡Partida iniciada!', 'success');
  };

  const endGame = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(timePerTurn);
    
    // Animaciones al finalizar
    playerNameScale.value = withTiming(1, { duration: 300 });
    
    showToast('Partida finalizada', 'success');
  };

  const nextTurn = useCallback(() => {
    if (players.length === 0) return;
    
    // Animación al cambiar de turno
    playerNameOpacity.value = withTiming(0.85, { duration: 150 }, () => {
      playerNameOpacity.value = withTiming(1, { duration: 200 });
    });
    playerNameScale.value = withTiming(1.005, { duration: 150 }, () => {
      playerNameScale.value = withTiming(1.01, { duration: 200 });
    });
    
    setCurrentPlayerIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % players.length;
      return nextIndex;
    });
    setTimeRemaining(timePerTurn);
    setIsPaused(false);
  }, [players.length, timePerTurn]);

  const togglePause = () => {
    if (!isRunning) return;
    setIsPaused(!isPaused);
  };

  const resetGame = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentPlayerIndex(0);
    setTimeRemaining(timePerTurn);
    
    // Animaciones al reiniciar
    playerNameScale.value = withTiming(1, { duration: 300 });
    
    showToast('Partida reiniciada', 'success');
  };

  const playerNameAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: playerNameScale.value }],
      opacity: playerNameOpacity.value,
    };
  });

  // Timer effect
  useEffect(() => {
    if (isRunning && !isPaused && timeRemaining > 0 && players.length > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Tiempo acabado
            const currentPlayer = players[currentPlayerIndex];
            playAlarmSound();
            showToast(`¡Tiempo de ${currentPlayer} terminado!`, 'error');
            // Pasar al siguiente jugador automáticamente después de un breve delay
            setTimeout(() => {
              nextTurn();
            }, 500);
            return 0; // Mostrar 00:00 brevemente
          }
          
          // Reproducir tick sound + haptic ligero en los últimos 10 segundos
          if (prev <= 10 && prev > 0) {
            playTickSound();
          }
          
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isPaused, timeRemaining, currentPlayerIndex, players, timePerTurn, nextTurn, playTickSound, playAlarmSound]);

  const currentPlayer = players[currentPlayerIndex] || '';

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
        duration={3000}
        type={toastType}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>RUMI</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Temporizador de partida
          </Text>
        </View>

        {/* Configuración de tiempo - Solo visible cuando no está corriendo */}
        {!isRunning && (
          <Animated.View 
            style={[
              styles.section, 
              { backgroundColor: theme.card },
            ]}
            entering={FadeIn.duration(600)}
            exiting={FadeOut.duration(500)}
          >
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: theme.button }]}>
              <Ionicons name="time-outline" size={20} color={theme.text} />
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Tiempo por Turno</Text>
              <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                Configura el tiempo en segundos
              </Text>
            </View>
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="60"
              placeholderTextColor={theme.textSecondary}
              value={timeConfigInput}
              onChangeText={handleTimeConfigChange}
              keyboardType="numeric"
              editable={!isRunning}
            />
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>segundos</Text>
          </View>
          </Animated.View>
        )}

        {/* Gestión de jugadores - Solo visible cuando no está corriendo */}
        {!isRunning && (
          <Animated.View 
            style={[
              styles.section, 
              { backgroundColor: theme.card },
            ]}
            entering={FadeIn.duration(600)}
            exiting={FadeOut.duration(500)}
          >
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: theme.button }]}>
              <Ionicons name="people-outline" size={20} color={theme.text} />
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Jugadores</Text>
              <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                {players.length} jugador{players.length !== 1 ? 'es' : ''}
              </Text>
            </View>
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border, marginBottom: 16 }]}>
            <TextInput
              style={[styles.input, { color: theme.text, flex: 1 }]}
              placeholder="Nombre del jugador"
              placeholderTextColor={theme.textSecondary}
              value={newPlayerName}
              onChangeText={setNewPlayerName}
              onSubmitEditing={addPlayer}
              editable={!isRunning}
            />
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#3b82f6' }]}
              onPress={addPlayer}
              disabled={isRunning}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {players.length > 0 && (
            <View style={styles.playersList}>
              {players.map((player, index) => (
                <DraggablePlayerCard
                  key={player}
                  player={player}
                  index={index}
                  isActive={index === currentPlayerIndex}
                  isRunning={isRunning}
                  totalPlayers={players.length}
                  onRemove={() => removePlayer(index)}
                  onReorder={reorderPlayers}
                  theme={theme}
                />
              ))}
            </View>
          )}
          </Animated.View>
        )}

        {/* Temporizador y nombre del jugador grande */}
        {isRunning && currentPlayer && (
          <Animated.View 
            style={[styles.section, { backgroundColor: theme.card }]}
            entering={SlideInDown.duration(800)}
          >
            <Animated.View style={playerNameAnimatedStyle}>
              <View style={[styles.currentPlayerContainer, { backgroundColor: theme.background }]}>
                <Text style={[styles.currentPlayerLabel, { color: theme.textSecondary }]}>
                  TURNO DE
                </Text>
                <Text style={[styles.currentPlayerName, { color: '#3b82f6' }]}>
                  {currentPlayer}
                </Text>
              </View>
            </Animated.View>

            <View style={[styles.timerContainer, { backgroundColor: theme.background }]}>
              <Text
                style={[
                  styles.timerText,
                  {
                    color: timeRemaining <= 10 ? theme.error : theme.text,
                  },
                ]}
              >
                {formatTime(timeRemaining)}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Controles */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.controlsContainer}>
            {!isRunning ? (
              <TouchableOpacity
                style={[styles.controlButton, styles.primaryButton, { backgroundColor: '#3b82f6' }]}
                onPress={startGame}
                disabled={players.length < 2}
                activeOpacity={0.7}
              >
                <Ionicons name="play" size={20} color="#ffffff" />
                <Text style={styles.controlButtonText}>Iniciar Partida</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.controlButton, styles.secondaryButton, { backgroundColor: theme.button, borderColor: theme.border }]}
                  onPress={togglePause}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isPaused ? 'play' : 'pause'}
                    size={20}
                    color={theme.text}
                  />
                  <Text style={[styles.controlButtonText, { color: theme.text }]}>
                    {isPaused ? 'Reanudar' : 'Pausar'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, styles.secondaryButton, { backgroundColor: theme.button, borderColor: theme.border }]}
                  onPress={nextTurn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-forward" size={20} color={theme.text} />
                  <Text style={[styles.controlButtonText, { color: theme.text }]}>
                    Siguiente Turno
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, styles.secondaryButton, { backgroundColor: theme.button, borderColor: theme.border }]}
                  onPress={resetGame}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={20} color={theme.text} />
                  <Text style={[styles.controlButtonText, { color: theme.text }]}>
                    Reiniciar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, styles.dangerButton, { backgroundColor: theme.error, borderColor: theme.error }]}
                  onPress={endGame}
                  activeOpacity={0.7}
                >
                  <Ionicons name="stop" size={20} color="#ffffff" />
                  <Text style={[styles.controlButtonText, { color: '#ffffff' }]}>
                    Finalizar Partida
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Footer Spacing */}
        <View style={styles.footer} />
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
    paddingTop: 24,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '400',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  sectionDescription: {
    fontSize: 13,
    fontWeight: '400',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 50,
    gap: 12,
  },
  input: {
    fontSize: 15,
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playersList: {
    gap: 12,
  },
  playerCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  playerName: {
    fontSize: 16,
    flex: 1,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  removeButton: {
    padding: 4,
  },
  timerContainer: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  timerText: {
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: 4,
  },
  controlsContainer: {
    gap: 12,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  dangerButton: {
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  footer: {
    height: 20,
  },
  currentPlayerContainer: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  currentPlayerLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  currentPlayerName: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
  },
});

