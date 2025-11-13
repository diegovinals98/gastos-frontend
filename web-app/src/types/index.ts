export interface Gasto {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
}

export interface GastosResponse {
  year: number;
  month: number;
  count: number;
  gastos: Gasto[];
}

