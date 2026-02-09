import Decimal from 'decimal.js';
import { parseExcelPrice, type ParsedExcel } from '@features/editor/lib/excel-parser';

export interface ExcelImportMapping {
  pozNoColumn: number;
  descriptionColumn: number;
  unitColumn: number;
  quantityColumn: number;
  unitPriceColumn: number;
}

export interface ImportedRow {
  pozNo: string;
  description: string;
  unit: string;
  quantity: Decimal;
  unitPrice: Decimal;
}

export interface ImportResult {
  rows: ImportedRow[];
  skippedRows: number[];
}

const HEADER_HINTS: Record<keyof ExcelImportMapping, string[]> = {
  pozNoColumn: ['poz', 'poz no', 'iş kalemi no', 'iş kalemi', 'kalem no'],
  descriptionColumn: ['açıklama', 'tanım', 'description', 'iş kalemi açıklama'],
  unitColumn: ['birim', 'ölçü birimi', 'unit'],
  quantityColumn: ['miktar', 'quantity', 'adet'],
  unitPriceColumn: ['birim fiyat', 'fiyat', 'price', 'unit price', 'b.fiyat'],
};

export function guessColumnMapping(headers: string[]): ExcelImportMapping {
  const lower = headers.map((h) => h.toLowerCase().trim());

  function findColumn(hints: string[], fallback: number): number {
    for (const hint of hints) {
      const idx = lower.findIndex((h) => h.includes(hint));
      if (idx !== -1) return idx;
    }
    return fallback;
  }

  return {
    pozNoColumn: findColumn(HEADER_HINTS.pozNoColumn, 0),
    descriptionColumn: findColumn(HEADER_HINTS.descriptionColumn, 1),
    unitColumn: findColumn(HEADER_HINTS.unitColumn, 2),
    quantityColumn: findColumn(HEADER_HINTS.quantityColumn, 3),
    unitPriceColumn: findColumn(HEADER_HINTS.unitPriceColumn, 4),
  };
}

export function importExcelRows(excel: ParsedExcel, mapping: ExcelImportMapping): ImportResult {
  const rows: ImportedRow[] = [];
  const skippedRows: number[] = [];

  // Skip header row (index 0)
  for (let i = 1; i < excel.rows.length; i++) {
    const row = excel.rows[i];
    const pozNo = row.cells[mapping.pozNoColumn]?.trim() || '';

    if (!pozNo) {
      skippedRows.push(row.rowIndex + 1);
      continue;
    }

    const description = row.cells[mapping.descriptionColumn]?.trim() || '';
    const unit = row.cells[mapping.unitColumn]?.trim() || '';
    const quantity = parseExcelPrice(row.cells[mapping.quantityColumn]) ?? new Decimal(0);
    const unitPrice = parseExcelPrice(row.cells[mapping.unitPriceColumn]) ?? new Decimal(0);

    rows.push({ pozNo, description, unit, quantity, unitPrice });
  }

  return { rows, skippedRows };
}
