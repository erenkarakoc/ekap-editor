import Decimal from 'decimal.js';

export type { PozEntry } from '@features/cost-estimate/types';

export type PercentageCostSortKey =
  | 'rowNumber'
  | 'pozNo'
  | 'description'
  | 'unit'
  | 'quantity'
  | 'unitPrice'
  | 'total'
  | 'percentage'
  | 'estimatedCost';

export interface PercentageCostRow {
  id: string;
  rowNumber: number;
  pozNo: string;
  description: string;
  unit: string;
  quantity: Decimal;
  unitPrice: Decimal;
  total: Decimal;
  percentageLow: Decimal;
  percentageHigh: Decimal;
  estimatedCost: Decimal;
  useRange: boolean;
  fromDatabase: boolean;
}
