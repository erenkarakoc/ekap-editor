import Decimal from 'decimal.js';
import type { CostRow } from '../types';

export function createEmptyRow(rowNumber: number): CostRow {
  return {
    id: crypto.randomUUID(),
    rowNumber,
    pozNo: '',
    description: '',
    unit: '',
    quantity: new Decimal(0),
    unitPrice: new Decimal(0),
    total: new Decimal(0),
    fromDatabase: false,
  };
}

export function recalculateRowNumbers(rows: CostRow[]): CostRow[] {
  return rows.map((row, i) => ({ ...row, rowNumber: i + 1 }));
}

export function calculateGrandTotal(rows: CostRow[]): Decimal {
  return rows.reduce((sum, row) => sum.plus(row.total), new Decimal(0));
}
