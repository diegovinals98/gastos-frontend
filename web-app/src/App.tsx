import { useState, useEffect } from 'react';
import { BalanceCard } from './components/BalanceCard';
import { ExpensesList } from './components/ExpensesList';
import { MonthSelector } from './components/MonthSelector';
import { fetchGastos } from './services/api';
import { GastosResponse } from './types';
import { MONTHLY_BUDGET } from './config/env';
import './App.css';

function App() {
  const [gastosData, setGastosData] = useState<GastosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadGastos();
  }, [month, year]);

  const loadGastos = async () => {
    try {
      setLoading(true);
      const data = await fetchGastos(month, year);
      setGastosData(data);
    } catch (error) {
      console.error('Error loading gastos:', error);
      alert('No se pudieron cargar los gastos. Verifica que el servidor esté corriendo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGastos();
  };

  const handlePreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    if (year > currentYear || (year === currentYear && month >= currentMonth)) {
      return; // Don't allow future months
    }

    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const totalSpent = gastosData?.gastos.reduce((sum, gasto) => sum + gasto.amount, 0) || 0;

  return (
    <div className="app-container">
      <MonthSelector
        month={month}
        year={year}
        onPrevious={handlePreviousMonth}
        onNext={handleNextMonth}
      />
      {gastosData && (
        <BalanceCard
          totalSpent={totalSpent}
          monthlyBudget={MONTHLY_BUDGET}
          month={month}
          year={year}
        />
      )}
      <ExpensesList 
        gastos={gastosData?.gastos || []} 
        isLoading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </div>
  );
}

export default App;

