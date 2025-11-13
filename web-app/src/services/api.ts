import { GastosResponse } from '../types';
import { API_URL } from '../config/env';

export const fetchGastos = async (month: number, year: number): Promise<GastosResponse> => {
  try {
    const response = await fetch(`${API_URL}/gastos?month=${month}&year=${year}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching gastos: ${response.statusText}`);
    }
    
    const data: GastosResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching gastos:', error);
    throw error;
  }
};

