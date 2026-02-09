'use client';

import React, { useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import {
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@shared/components/ui/table';
import { Input } from '@shared/components/ui/input';
import { SortableHead } from '@shared/components/sortable-head';
import { formatTurkishNumber, parseTurkishNumber } from '@shared/lib/turkish-number';
import { PozSearchCell } from './poz-search-cell';
import type { CostRow, CostSortKey, PozEntry } from '../types';

const COLUMN_LABELS: Record<CostSortKey, string> = {
  rowNumber: '#',
  pozNo: 'Poz No',
  description: 'Açıklama',
  unit: 'Birim',
  quantity: 'Miktar',
  unitPrice: 'Birim Fiyat',
  total: 'Toplam',
};

const VISIBLE_COLUMNS: CostSortKey[] = [
  'rowNumber',
  'pozNo',
  'description',
  'unit',
  'quantity',
  'unitPrice',
  'total',
];

interface CostEstimateTableProps {
  rows: CostRow[];
  sortConfig: { key: CostSortKey | null; direction: 'asc' | 'desc' | null };
  columnWidths: Record<string, number>;
  onSort: (key: CostSortKey) => void;
  onSortExplicit: (key: CostSortKey, direction: 'asc' | 'desc') => void;
  onColumnResize: (key: string, width: number) => void;
  onHideColumn: (key: string) => void;
  onFitColumn: (key: string) => void;
  onUpdateRow: (id: string, updates: Partial<CostRow>) => void;
  onDeleteRow: (id: string) => void;
  onPozSelect: (id: string, entry: PozEntry) => void;
  focusedRowId: string | null;
}

export function CostEstimateTable({
  rows,
  sortConfig,
  columnWidths,
  onSort,
  onSortExplicit,
  onColumnResize,
  onHideColumn,
  onFitColumn,
  onUpdateRow,
  onDeleteRow,
  onPozSelect,
  focusedRowId,
}: CostEstimateTableProps) {
  const totalTableWidth = VISIBLE_COLUMNS.reduce(
    (sum, key) => sum + (columnWidths[key] || 0),
    0,
  );

  const handleQuantityChange = useCallback(
    (id: string, value: string) => {
      const quantity = parseTurkishNumber(value);
      if (quantity.isNegative()) return;
      onUpdateRow(id, { quantity });
    },
    [onUpdateRow],
  );

  const handleUnitPriceChange = useCallback(
    (id: string, value: string) => {
      const unitPrice = parseTurkishNumber(value);
      if (unitPrice.isNegative()) return;
      onUpdateRow(id, { unitPrice });
    },
    [onUpdateRow],
  );

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isControl =
      e.ctrlKey ||
      e.metaKey ||
      ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'ArrowDown', 'ArrowUp'].includes(e.key);
    if (isControl) return;
    if (/^[0-9]$/.test(e.key)) return;
    if (e.key === '.' || e.key === ',') {
      const val = e.currentTarget.value;
      if (val.includes(',') || val.includes('.')) {
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      return;
    }
    e.preventDefault();
  };

  return (
    <table
      className="border-border relative w-full max-w-full table-fixed caption-bottom border-separate border-spacing-0 text-sm"
      style={{ width: `${totalTableWidth}px` }}
    >
      <TableHeader className="bg-background sticky top-0 z-10">
        <TableRow className="hover:bg-transparent">
          {VISIBLE_COLUMNS.map((key) => (
            <SortableHead
              key={key}
              label={COLUMN_LABELS[key]}
              sortKey={key}
              activeConfig={sortConfig}
              onSort={onSort}
              onSortExplicit={onSortExplicit}
              width={columnWidths[key] || 100}
              onResize={(w) => onColumnResize(key, w)}
              onHide={onHideColumn}
              onFit={onFitColumn}
              className={
                key === 'rowNumber'
                  ? 'text-center'
                  : key === 'quantity' || key === 'unitPrice' || key === 'total'
                    ? 'text-right'
                    : ''
              }
            />
          ))}
        </TableRow>
      </TableHeader>
      <TableBody className="[&_tr:last-child_td]:border-b-0">
        {rows.map((row) => (
          <TableRow key={row.id} className="hover:bg-muted/30 odd:bg-muted/5 group">
            {/* # */}
            <TableCell className="text-muted-foreground border-border overflow-hidden border-r border-b py-1 text-center text-xs font-medium">
              {row.rowNumber}
            </TableCell>

            {/* Poz No */}
            <TableCell className="border-border overflow-hidden border-r border-b p-1">
              <PozSearchCell
                value={row.pozNo}
                onChange={(val) => onUpdateRow(row.id, { pozNo: val })}
                onSelect={(entry) => onPozSelect(row.id, entry)}
                autoFocus={row.id === focusedRowId}
              />
            </TableCell>

            {/* Açıklama */}
            <TableCell className="border-border max-w-0 overflow-hidden border-r border-b p-1">
              <Input
                className="h-8 text-sm"
                value={row.description}
                onChange={(e) => onUpdateRow(row.id, { description: e.target.value })}
                placeholder="Açıklama"
              />
            </TableCell>

            {/* Birim */}
            <TableCell className="border-border overflow-hidden border-r border-b p-1">
              <Input
                className="h-8 text-xs"
                value={row.unit}
                onChange={(e) => onUpdateRow(row.id, { unit: e.target.value })}
                placeholder="Birim"
              />
            </TableCell>

            {/* Miktar */}
            <TableCell className="border-border overflow-hidden border-r border-b p-1">
              <Input
                className="h-8 text-right font-mono text-sm"
                defaultValue={row.quantity.isZero() ? '' : formatTurkishNumber(row.quantity)}
                key={`qty-${row.id}`}
                onBlur={(e) => handleQuantityChange(row.id, e.target.value)}
                onKeyDown={handleNumericKeyDown}
                placeholder="0,00"
              />
            </TableCell>

            {/* Birim Fiyat */}
            <TableCell className="border-border overflow-hidden border-r border-b p-1">
              <Input
                className="h-8 text-right font-mono text-sm"
                defaultValue={row.unitPrice.isZero() ? '' : formatTurkishNumber(row.unitPrice)}
                key={`price-${row.id}-${row.fromDatabase ? row.unitPrice.toString() : ''}`}
                onBlur={(e) => handleUnitPriceChange(row.id, e.target.value)}
                onKeyDown={handleNumericKeyDown}
                placeholder="0,00"
              />
            </TableCell>

            {/* Toplam */}
            <TableCell className="border-border overflow-hidden border-r border-b py-1 pr-2 text-right font-mono text-sm font-medium">
              <div className="flex items-center justify-end gap-1">
                <span>{row.total.isZero() ? '' : formatTurkishNumber(row.total)}</span>
                <button
                  className="text-muted-foreground hover:text-destructive ml-1 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => onDeleteRow(row.id)}
                  title="Satırı sil"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={VISIBLE_COLUMNS.length}
              className="text-muted-foreground h-32 text-center"
            >
              Henüz satır eklenmedi. &quot;Satır Ekle&quot; ile başlayın.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </table>
  );
}
