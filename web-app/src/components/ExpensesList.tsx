import React from 'react';
import { Gasto } from '../types';
import { ExpenseItem } from './ExpenseItem';
import './ExpensesList.css';

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
  const handleRefresh = () => {
    if (onRefresh && !refreshing) {
      onRefresh();
    }
  };

  if (isLoading && !refreshing) {
    return (
      <div className="expenses-list-container">
        <div className="skeleton-item" />
        <div className="skeleton-item" />
        <div className="skeleton-item" />
      </div>
    );
  }

  if (gastos.length === 0 && !isLoading) {
    return (
      <div className="expenses-list-empty">
        <p className="expenses-list-empty-text">No hay gastos para este mes</p>
      </div>
    );
  }

  return (
    <div className="expenses-list-wrapper">
      {refreshing && (
        <div className="expenses-list-refreshing">
          <p>Actualizando...</p>
        </div>
      )}
      <div className="expenses-list">
        {gastos.map((gasto) => (
          <ExpenseItem key={gasto.id} gasto={gasto} />
        ))}
      </div>
      {onRefresh && (
        <button 
          onClick={handleRefresh} 
          className="expenses-list-refresh-button"
          disabled={refreshing}
        >
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      )}
    </div>
  );
};

