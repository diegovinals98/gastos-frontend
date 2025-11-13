import React from 'react';
import { FlatList, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { ExpenseItem } from './ExpenseItem';
import { Gasto } from '../types';
import { useTheme } from '../config/theme';

interface ExpensesListProps {
  gastos: Gasto[];
  isLoading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  highlightedExpenseId?: string | null;
  flatListRef?: React.RefObject<FlatList>;
}

export const ExpensesList: React.FC<ExpensesListProps> = ({ 
  gastos, 
  isLoading, 
  refreshing = false,
  onRefresh,
  highlightedExpenseId,
  flatListRef
}) => {
  const theme = useTheme();

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={[styles.skeletonItem, { backgroundColor: theme.skeleton }]} />
        <View style={[styles.skeletonItem, { backgroundColor: theme.skeleton }]} />
        <View style={[styles.skeletonItem, { backgroundColor: theme.skeleton }]} />
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={gastos}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const isHighlighted = highlightedExpenseId !== null && String(item.id) === String(highlightedExpenseId);
        if (isHighlighted) {
          console.log('🎯 [ExpensesList] Renderizando gasto resaltado:', item.id, 'Merchant:', item.merchant);
        }
        return (
          <ExpenseItem 
            gasto={item} 
            isHighlighted={isHighlighted}
          />
        );
      }}
      contentContainerStyle={[
        styles.list,
        gastos.length === 0 && styles.emptyListContainer
      ]}
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No hay gastos para este mes</Text>
          </View>
        ) : null
      }
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.textSecondary}
          />
        ) : undefined
      }
      style={styles.flatList}
      onScrollToIndexFailed={(info) => {
        // Si falla el scroll, intentar después de un delay
        setTimeout(() => {
          flatListRef?.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
        }, 100);
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  flatList: {
    flex: 1,
  },
  list: {
    paddingBottom: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyText: {
    fontSize: 16,
  },
  skeletonItem: {
    height: 80,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
  },
});

