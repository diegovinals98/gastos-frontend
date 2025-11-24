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

