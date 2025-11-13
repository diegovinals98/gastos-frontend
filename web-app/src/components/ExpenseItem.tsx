import React from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Gasto } from '../types';
import './ExpenseItem.css';

interface ExpenseItemProps {
  gasto: Gasto;
}

export const ExpenseItem: React.FC<ExpenseItemProps> = ({ gasto }) => {
  const date = parseISO(gasto.date);
  const formattedDate = format(date, "d 'de' MMMM, HH:mm", { locale: es });
  const amount = Math.abs(gasto.amount);

  return (
    <div className="expense-item">
      <div className="expense-item-content">
        <p className="expense-item-merchant">{gasto.merchant}</p>
        <p className="expense-item-date">{formattedDate}</p>
      </div>
      <div className="expense-item-amount-container">
        <p className="expense-item-amount">-{amount.toFixed(2)} €</p>
      </div>
    </div>
  );
};

