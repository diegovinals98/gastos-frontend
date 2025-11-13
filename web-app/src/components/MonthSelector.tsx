import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import './MonthSelector.css';

interface MonthSelectorProps {
  month: number;
  year: number;
  onPrevious: () => void;
  onNext: () => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  month,
  year,
  onPrevious,
  onNext,
}) => {
  const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: es });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <div className="month-selector">
      <button onClick={onPrevious} className="month-selector-button" aria-label="Mes anterior">
        ‹
      </button>
      
      <h2 className="month-selector-text">{capitalizedMonth}</h2>
      
      <button onClick={onNext} className="month-selector-button" aria-label="Mes siguiente">
        ›
      </button>
    </div>
  );
};

