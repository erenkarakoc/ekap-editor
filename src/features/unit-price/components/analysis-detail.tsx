'use client';

import Decimal from 'decimal.js';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { formatTurkishNumber } from '@shared/lib/turkish-number';
import type { PozWithAnalysis, AnalysisCategory } from '../types';

const CATEGORY_CONFIG: Record<AnalysisCategory, { label: string; color: string }> = {
  malzeme: { label: 'Malzeme', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
  iscilik: { label: 'İşçilik', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' },
  makine: { label: 'Makine', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' },
  nakliye: { label: 'Nakliye', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
};

interface AnalysisDetailProps {
  poz: PozWithAnalysis;
}

export function AnalysisDetail({ poz }: AnalysisDetailProps) {
  if (!poz.analysis || poz.analysis.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center text-sm">
            Bu poz için analiz verisi bulunmamaktadır.
          </p>
        </CardContent>
      </Card>
    );
  }

  const grouped = poz.analysis.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<AnalysisCategory, typeof poz.analysis>,
  );

  const categoryTotals = (Object.keys(grouped) as AnalysisCategory[]).map((cat) => {
    const items = grouped[cat];
    const total = items.reduce(
      (sum, item) => sum.plus(item.quantity.times(item.unitPrice)),
      new Decimal(0),
    );
    return { category: cat, total };
  });

  const subtotal = categoryTotals.reduce((s, ct) => s.plus(ct.total), new Decimal(0));
  const profitRate = poz.profitRate ?? 25;
  const profit = subtotal.times(new Decimal(profitRate).div(100));
  const grandTotal = subtotal.plus(profit);

  return (
    <div className="space-y-4">
      {/* Poz Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-sm font-medium">{poz.pozNo}</p>
              <p className="text-sm">{poz.description}</p>
              <p className="text-muted-foreground text-xs">Birim: {poz.unit}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs">Birim Fiyat</p>
              <p className="font-mono text-lg font-bold">{formatTurkishNumber(poz.unitPrice)} TL</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analiz Kırılımı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Rayiç No</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="w-16">Birim</TableHead>
                  <TableHead className="w-20 text-right">Miktar</TableHead>
                  <TableHead className="w-28 text-right">Birim Fiyat</TableHead>
                  <TableHead className="w-28 text-right">Tutar</TableHead>
                  <TableHead className="w-24">Grup</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(CATEGORY_CONFIG) as AnalysisCategory[]).map((cat) => {
                  const items = grouped[cat];
                  if (!items) return null;
                  return items.map((item, i) => (
                    <TableRow key={`${cat}-${i}`}>
                      <TableCell className="font-mono text-xs">{item.code}</TableCell>
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell className="text-xs">{item.unit}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {item.quantity.toFixed(3).replace('.', ',')}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatTurkishNumber(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatTurkishNumber(item.quantity.times(item.unitPrice))}
                      </TableCell>
                      <TableCell>
                        <span className={`rounded px-1.5 py-0.5 text-xs ${CATEGORY_CONFIG[cat].color}`}>
                          {CATEGORY_CONFIG[cat].label}
                        </span>
                      </TableCell>
                    </TableRow>
                  ));
                })}
              </TableBody>
            </Table>
          </div>

          {/* Category Summaries */}
          <div className="mt-4 space-y-1.5">
            {categoryTotals.map((ct) => (
              <div key={ct.category} className="flex items-center justify-between text-sm">
                <span className={`rounded px-1.5 py-0.5 text-xs ${CATEGORY_CONFIG[ct.category].color}`}>
                  {CATEGORY_CONFIG[ct.category].label}
                </span>
                <span className="font-mono">{formatTurkishNumber(ct.total)} TL</span>
              </div>
            ))}
            <div className="border-t pt-1.5 flex justify-between text-sm">
              <span className="text-muted-foreground">Ara Toplam</span>
              <span className="font-mono">{formatTurkishNumber(subtotal)} TL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Kar ve Genel Gider (%{profitRate})</span>
              <span className="font-mono">{formatTurkishNumber(profit)} TL</span>
            </div>
            <div className="border-t pt-1.5 flex justify-between font-medium">
              <span>Toplam</span>
              <span className="font-mono">{formatTurkishNumber(grandTotal)} TL</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
