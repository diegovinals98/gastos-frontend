import React from 'react';
import { FlatList, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { ExpenseItem } from './ExpenseItem';
import { Gasto } from '../types';

interface ExpensesListProps {
  gastos: Gasto[];
  isLoading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const ExpensesList: React.FC<ExpensesListProps> = ({ 
  gastos, 
  isLoading, 
  refreshing = false,
  onRefresh 
}) => {
  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonItem} />
        <View style={styles.skeletonItem} />
        <View style={styles.skeletonItem} />
      </View>
    );
  }

  return (
    <FlatList
      data={gastos}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ExpenseItem gasto={item} />}
      contentContainerStyle={[
        styles.list,
        gastos.length === 0 && styles.emptyListContainer
      ]}
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay gastos para este mes</Text>
          </View>
        ) : null
      }
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      style={styles.flatList}
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
    color: '#6b7280',
  },
  skeletonItem: {
    height: 80,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
  },
});

