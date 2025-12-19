export type GastoStatus = 'complete' | 'decline' | 'refund' | 'reverse' | 'pending' | 'rejected';

export interface Gasto {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  status: GastoStatus | string;
  approved?: boolean;
  location?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface GastosResponse {
  year: number;
  month: number;
  count: number;
  gastos: Gasto[];
}

// Auth Types
export interface User {
  id: number;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

