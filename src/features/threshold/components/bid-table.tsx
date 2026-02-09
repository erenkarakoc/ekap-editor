'use client';

import { Plus, Trash2 } from 'lucide-react';
import Decimal from 'decimal.js';

import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/components/ui/table';
import type { BidResult } from '../lib/threshold-calc';

export interface BidRow {
  id: string;
  name: string;
  amountStr: string;
}

interface BidTableProps {
  bids: BidRow[];
  results: BidResult[] | null;
  onChange: (bids: BidRow[]) => void;
}

const statusColors: Record<string, string> = {
  normal: 'bg-green-50 dark:bg-green-950/30',
  low: 'bg-red-50 dark:bg-red-950/30',
  excluded: 'bg-muted/50',
};

const statusLabels: Record<string, string> = {
  normal: 'Normal',
  low: 'Aşırı Düşük',
  excluded: 'Kapsam Dışı',
};

export function BidTable({ bids, results, onChange }: BidTableProps) {
  const addBid = () => {
    onChange([
      ...bids,
      { id: crypto.randomUUID(), name: '', amountStr: '' },
    ]);
  };

  const removeBid = (id: string) => {
    onChange(bids.filter((b) => b.id !== id));
  };

  const updateBid = (id: string, field: 'name' | 'amountStr', value: string) => {
    onChange(bids.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">Teklifler</h3>
        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={addBid}>
          <Plus className="size-3.5" />
          Teklif Ekle
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>İstekli Adı</TableHead>
              <TableHead className="w-48">Teklif Tutarı (TL)</TableHead>
              {results && <TableHead className="w-32">Durum</TableHead>}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {bids.length === 0 && (
              <TableRow>
                <TableCell colSpan={results ? 5 : 4} className="text-muted-foreground h-20 text-center">
                  Teklif eklemek için yukarıdaki butonu kullanın.
                </TableCell>
              </TableRow>
            )}
            {bids.map((bid, i) => {
              const result = results?.[i];
              const rowClass = result ? statusColors[result.status] : '';
              return (
                <TableRow key={bid.id} className={rowClass}>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="İstekli adı"
                      value={bid.name}
                      onChange={(e) => updateBid(bid.id, 'name', e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="0,00"
                      value={bid.amountStr}
                      onChange={(e) => updateBid(bid.id, 'amountStr', e.target.value)}
                      className="h-8 font-mono"
                    />
                  </TableCell>
                  {results && (
                    <TableCell>
                      {result && (
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            result.status === 'normal'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                              : result.status === 'low'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {statusLabels[result.status]}
                        </span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7"
                      onClick={() => removeBid(bid.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
