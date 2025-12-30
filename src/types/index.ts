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

// Speedtest Types
export interface SpeedtestResult {
  id: string;
  downloadSpeed: number; // en Mbps
  uploadSpeed: number; // en Mbps
  ping: number; // en ms
  timestamp: string; // ISO date string
  server?: string;
  location?: string;
}

export interface SpeedtestSummary {
  latest?: SpeedtestResult;
  average?: {
    downloadSpeed: number;
    uploadSpeed: number;
    ping: number;
  };
  totalTests?: number;
}

export interface SpeedtestHistoryResponse {
  results: SpeedtestResult[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

