import Decimal from 'decimal.js';
import type { CatalogSource } from './lib/catalog';

export interface PozEntry {
  pozNo: string;
  description: string;
  unit: string;
  unitPrice: Decimal;
  institution: string;
  source?: CatalogSource;
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
  source?: CatalogSource;
}

export type CostSortKey =
  | 'rowNumber'
  | 'pozNo'
  | 'description'
  | 'unit'
  | 'quantity'
  | 'unitPrice'
  | 'total'
  | 'percentage';
