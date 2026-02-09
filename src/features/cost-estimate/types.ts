import Decimal from 'decimal.js';

export interface PozEntry {
  pozNo: string;
  description: string;
  unit: string;
  unitPrice: Decimal;
  institution: 'DSI' | 'CSB' | 'KTB';
}

export interface CostRow {
  id: string;
  rowNumber: number;
  pozNo: string;
  description: string;
  unit: string;
  quantity: Decimal;
  unitPrice: Decimal;
  total: Decimal;
  fromDatabase: boolean;
}

export type CostSortKey = 'rowNumber' | 'pozNo' | 'description' | 'unit' | 'quantity' | 'unitPrice' | 'total';
