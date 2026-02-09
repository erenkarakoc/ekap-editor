import Decimal from 'decimal.js';
import type { PercentageCostRow } from '../types';

export function createEmptyRow(rowNumber: number): PercentageCostRow {
  return {
    id: crypto.randomUUID(),
    rowNumber,
    pozNo: '',
    description: '',
    unit: '',
    quantity: new Decimal(0),
    unitPrice: new Decimal(0),
    total: new Decimal(0),
    percentageLow: new Decimal(0),
    percentageHigh: new Decimal(0),
    estimatedCost: new Decimal(0),
    useRange: false,
    fromDatabase: false,
  };
}

export function recalculateRowNumbers(rows: PercentageCostRow[]): PercentageCostRow[] {
  return rows.map((row, i) => ({ ...row, rowNumber: i + 1 }));
}

export function getEffectivePercentage(low: Decimal, high: Decimal): Decimal {
  const lowPositive = low.greaterThan(0);
  const highPositive = high.greaterThan(0);
  if (lowPositive && highPositive) return low.plus(high).div(2);
  if (lowPositive) return low;
  if (highPositive) return high;
  return new Decimal(0);
}

export function calculateEstimatedCost(total: Decimal, effectivePercentage: Decimal): Decimal {
  if (effectivePercentage.isZero()) return new Decimal(0);
  return total.div(effectivePercentage).times(100);
}

export function calculateWeightedAverage(rows: PercentageCostRow[]): Decimal {
  let sumProduct = new Decimal(0);
  let sumPercentage = new Decimal(0);

  for (const row of rows) {
    const pct = getEffectivePercentage(row.percentageLow, row.percentageHigh);
    if (pct.isZero()) continue;
    sumProduct = sumProduct.plus(row.estimatedCost.times(pct));
    sumPercentage = sumPercentage.plus(pct);
  }

  if (sumPercentage.isZero()) return new Decimal(0);
  return sumProduct.div(sumPercentage);
}
