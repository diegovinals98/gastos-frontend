import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import './BalanceCard.css';

interface BalanceCardProps {
  totalSpent: number;
  monthlyBudget: number;
  month: number;
  year: number;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  totalSpent,
  monthlyBudget,
  month,
  year,
}) => {
  const remaining = monthlyBudget + totalSpent; // totalSpent is negative
  const percentage = monthlyBudget > 0 ? Math.abs((totalSpent / monthlyBudget) * 100) : 0;
  const isOverBudget = remaining < 0;

  const monthName = format(new Date(year, month - 1), 'MMMM', { locale: es });

  const getProgressColor = () => {
    if (isOverBudget) return '#ef4444';
    if (percentage > 80) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="balance-card">
      <h3 className="balance-card-month">
        {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {year}
      </h3>
      
      <div className="balance-card-balance">
        <p className="balance-card-label">Saldo restante</p>
        <p className={`balance-card-amount ${isOverBudget ? 'over-budget' : ''}`}>
          {remaining.toFixed(2)} €
        </p>
      </div>

      <div className="balance-card-stats">
        <div className="balance-card-stat">
          <p className="balance-card-stat-label">Gastado</p>
          <p className="balance-card-stat-value">{Math.abs(totalSpent).toFixed(2)} €</p>
        </div>
        <div className="balance-card-stat">
          <p className="balance-card-stat-label">Presupuesto</p>
          <p className="balance-card-stat-value">{monthlyBudget.toFixed(2)} €</p>
        </div>
        <div className="balance-card-stat">
          <p className="balance-card-stat-label">% usado</p>
          <p className={`balance-card-stat-value ${isOverBudget ? 'over-budget' : ''}`}>
            {percentage.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="balance-card-progress-bar">
        <div
          className="balance-card-progress-fill"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: getProgressColor(),
          }}
        />
      </div>
    </div>
  );
};

