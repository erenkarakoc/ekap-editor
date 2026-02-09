'use client';

import { useState, useCallback } from 'react';
import Decimal from 'decimal.js';

import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/components/ui/table';
import { formatTurkishNumber, parseTurkishNumber } from '@shared/lib/turkish-number';
import { calculatePriceDiff, validateCoefficients } from '../lib/price-diff-calc';
import type { PriceDiffResult } from '../lib/price-diff-calc';

const INDEX_LABELS = [
  { key: 'a', label: 'İşçilik', symbol: 'I' },
  { key: 'b1', label: 'Malzeme 1 (Çimento)', symbol: 'Ç' },
  { key: 'b2', label: 'Malzeme 2 (Demir)', symbol: 'D' },
  { key: 'b3', label: 'Malzeme 3 (Akaryakıt)', symbol: 'AY' },
  { key: 'b4', label: 'Malzeme 4 (Yerli)', symbol: 'Y' },
  { key: 'b5', label: 'Malzeme 5 (Kur)', symbol: 'K' },
  { key: 'c', label: 'Makine Amortismanı', symbol: 'M' },
];

interface FormState {
  anStr: string;
  coefficients: string[]; // a, b1, b2, b3, b4, b5, c
  baseIndices: string[]; // Io, Ço, Do, AYo, Yo, Ko, Mo
  currentIndices: string[];
}

const emptyForm: FormState = {
  anStr: '',
  coefficients: ['', '', '', '', '', '', ''],
  baseIndices: ['', '', '', '', '', '', ''],
  currentIndices: ['', '', '', '', '', '', ''],
};

export function PriceDiffView() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [result, setResult] = useState<PriceDiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateCoeff = (i: number, v: string) => {
    setForm((prev) => {
      const next = [...prev.coefficients];
      next[i] = v;
      return { ...prev, coefficients: next };
    });
  };

  const updateBase = (i: number, v: string) => {
    setForm((prev) => {
      const next = [...prev.baseIndices];
      next[i] = v;
      return { ...prev, baseIndices: next };
    });
  };

  const updateCurrent = (i: number, v: string) => {
    setForm((prev) => {
      const next = [...prev.currentIndices];
      next[i] = v;
      return { ...prev, currentIndices: next };
    });
  };

  const calculate = useCallback(() => {
    setError(null);
    const an = parseTurkishNumber(form.anStr);
    if (an.isZero()) {
      setError('Hakediş tutarı giriniz.');
      return;
    }

    const coeffs = form.coefficients.map((c) => {
      const v = parseTurkishNumber(c);
      return v;
    });

    const a = coeffs[0];
    const b = coeffs.slice(1, 6);
    const c = coeffs[6];

    if (!validateCoefficients(a, b, c)) {
      setError('Katsayılar toplamı 1,00 olmalıdır.');
      return;
    }

    const bases = form.baseIndices.map((v) => parseTurkishNumber(v));
    const currents = form.currentIndices.map((v) => parseTurkishNumber(v));

    setResult(
      calculatePriceDiff({
        an,
        coefficients: { a, b, c },
        indices: {
          labor: { base: bases[0], current: currents[0] },
          materials: b.map((_, i) => ({
            base: bases[i + 1],
            current: currents[i + 1],
          })),
          machinery: { base: bases[6], current: currents[6] },
        },
      }),
    );
  }, [form]);

  const coeffSum = form.coefficients.reduce(
    (s, c) => s.plus(parseTurkishNumber(c)),
    new Decimal(0),
  );

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Hakediş Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hakediş Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="an">Hakediş Tutarı — An (TL)</Label>
              <Input
                id="an"
                placeholder="0,00"
                value={form.anStr}
                onChange={(e) => setForm((p) => ({ ...p, anStr: e.target.value }))}
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Katsayı ve Endeks Tablosu */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Katsayılar ve Endeksler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Grup</TableHead>
                    <TableHead className="w-28">Katsayı</TableHead>
                    <TableHead className="w-36">Temel Endeks</TableHead>
                    <TableHead className="w-36">Güncel Endeks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {INDEX_LABELS.map((item, i) => (
                    <TableRow key={item.key}>
                      <TableCell>
                        <div>
                          <span className="text-sm">{item.label}</span>
                          <span className="text-muted-foreground ml-1 text-xs">({item.key})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="0,00"
                          value={form.coefficients[i]}
                          onChange={(e) => updateCoeff(i, e.target.value)}
                          className="h-8 font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder={`${item.symbol}o`}
                          value={form.baseIndices[i]}
                          onChange={(e) => updateBase(i, e.target.value)}
                          className="h-8 font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder={`${item.symbol}n`}
                          value={form.currentIndices[i]}
                          onChange={(e) => updateCurrent(i, e.target.value)}
                          className="h-8 font-mono"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-medium">Toplam</TableCell>
                    <TableCell>
                      <span
                        className={`font-mono text-sm ${
                          coeffSum.eq(1)
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {coeffSum.isZero() ? '—' : coeffSum.toFixed(2).replace('.', ',')}
                      </span>
                    </TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

        {/* Calculate Button */}
        <div className="flex justify-center">
          <Button size="lg" onClick={calculate} className="px-12">
            Hesapla
          </Button>
        </div>

        {/* Result */}
        {result && (
          <>
            <Card className={result.f.gte(0) ? 'border-green-500/50' : 'border-red-500/50'}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground mb-1 text-sm">Fiyat Farkı (F)</p>
                  <p
                    className={`font-mono text-3xl font-bold ${
                      result.f.gte(0)
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {result.f.gte(0) ? '+' : ''}
                    {formatTurkishNumber(result.f)} TL
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {result.f.gte(0)
                      ? 'Yükleniciye ödeme yapılacak'
                      : 'Yükleniciden kesinti yapılacak'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hesaplama Detayı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pn katsayısı</span>
                    <span className="font-mono">{result.pn.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">B (sabit)</span>
                    <span className="font-mono">{result.b.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pn - 1</span>
                    <span className="font-mono">{result.pn.minus(1).toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-medium">
                    <span>F = An × B × (Pn - 1)</span>
                    <span className="font-mono">{formatTurkishNumber(result.f)} TL</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
