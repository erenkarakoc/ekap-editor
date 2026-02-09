'use client';

import { useState, useCallback } from 'react';
import Decimal from 'decimal.js';

import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { formatTurkishNumber, parseTurkishNumber } from '@shared/lib/turkish-number';
import { calculateThreshold } from '../lib/threshold-calc';
import type { ThresholdResult, Bid } from '../lib/threshold-calc';
import { BidTable } from './bid-table';
import type { BidRow } from './bid-table';

const N_OPTIONS = [
  { label: 'Üst Yapı (N = 1,00)', value: '1.00' },
  { label: 'Alt Yapı (N = 1,20)', value: '1.20' },
  { label: 'Özel', value: 'custom' },
];

export function ThresholdView() {
  const [ymStr, setYmStr] = useState('');
  const [nOption, setNOption] = useState('1.00');
  const [nCustomStr, setNCustomStr] = useState('1.00');
  const [bids, setBids] = useState<BidRow[]>([
    { id: crypto.randomUUID(), name: '', amountStr: '' },
    { id: crypto.randomUUID(), name: '', amountStr: '' },
    { id: crypto.randomUUID(), name: '', amountStr: '' },
  ]);
  const [result, setResult] = useState<ThresholdResult | null>(null);

  const calculate = useCallback(() => {
    const ym = parseTurkishNumber(ymStr);
    if (ym.isZero()) return;

    const n = nOption === 'custom'
      ? parseTurkishNumber(nCustomStr)
      : new Decimal(nOption);

    const validBids: Bid[] = bids
      .filter((b) => b.amountStr.trim() !== '')
      .map((b) => ({
        name: b.name || `İstekli ${bids.indexOf(b) + 1}`,
        amount: parseTurkishNumber(b.amountStr),
      }));

    if (validBids.length === 0) return;

    setResult(calculateThreshold(ym, n, validBids));
  }, [ymStr, nOption, nCustomStr, bids]);

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ym">Yaklaşık Maliyet (TL)</Label>
                <Input
                  id="ym"
                  placeholder="0,00"
                  value={ymStr}
                  onChange={(e) => setYmStr(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>N Katsayısı</Label>
                <div className="flex gap-2">
                  <select
                    className="border-input bg-background ring-offset-background flex h-9 flex-1 rounded-md border px-3 text-sm"
                    value={nOption}
                    onChange={(e) => setNOption(e.target.value)}
                  >
                    {N_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {nOption === 'custom' && (
                    <Input
                      placeholder="1,00"
                      value={nCustomStr}
                      onChange={(e) => setNCustomStr(e.target.value)}
                      className="w-24 font-mono"
                    />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bid Table */}
        <Card>
          <CardContent className="pt-6">
            <BidTable
              bids={bids}
              results={result?.bids ?? null}
              onChange={setBids}
            />
          </CardContent>
        </Card>

        {/* Calculate Button */}
        <div className="flex justify-center">
          <Button size="lg" onClick={calculate} className="px-12">
            Hesapla
          </Button>
        </div>

        {/* Result Section */}
        {result && (
          <>
            {/* Threshold Value */}
            <Card className="border-primary/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground mb-1 text-sm">Sınır Değer</p>
                  <p className="text-primary text-3xl font-bold font-mono">
                    {formatTurkishNumber(result.thresholdValue)} TL
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Calculation Steps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hesaplama Adımları</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <StepRow
                    label="Geçerli aralık"
                    value={`${formatTurkishNumber(result.steps.lowerBound)} — ${formatTurkishNumber(result.steps.upperBound)} TL`}
                    desc="YM×%40 — YM×%120"
                  />
                  <StepRow
                    label="Aralıktaki teklif sayısı"
                    value={`${result.steps.validBids.length}`}
                  />
                  <StepRow
                    label="Tort1 (aritmetik ortalama)"
                    value={`${formatTurkishNumber(result.steps.tort1)} TL`}
                  />
                  <StepRow
                    label="Standart sapma (σ)"
                    value={`${formatTurkishNumber(result.steps.stdDev)} TL`}
                  />
                  <StepRow
                    label="±1σ aralığındaki teklif sayısı"
                    value={`${result.steps.filteredBids.length}`}
                  />
                  <StepRow
                    label="Tort2 (filtrelenmiş ortalama)"
                    value={`${formatTurkishNumber(result.steps.tort2)} TL`}
                  />
                  <StepRow
                    label="C (Tort2 / YM)"
                    value={result.steps.c.toFixed(6)}
                  />
                  <StepRow
                    label="K"
                    value={result.steps.k.toFixed(6)}
                    desc={
                      result.steps.c.lt(new Decimal('0.60'))
                        ? 'C < 0,60 → K = C'
                        : 'C ≥ 0,60 → K = 0,60 + 0,40×C'
                    }
                  />
                  <StepRow
                    label="N"
                    value={result.steps.n.toFixed(2)}
                  />
                  <div className="border-t pt-2">
                    <StepRow
                      label="Sınır Değer (YM × K × N)"
                      value={`${formatTurkishNumber(result.thresholdValue)} TL`}
                      bold
                    />
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

function StepRow({
  label,
  value,
  desc,
  bold,
}: {
  label: string;
  value: string;
  desc?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div>
        <span className={bold ? 'font-semibold' : 'text-muted-foreground'}>{label}</span>
        {desc && (
          <span className="text-muted-foreground ml-2 text-xs">({desc})</span>
        )}
      </div>
      <span className={`font-mono ${bold ? 'text-base font-bold' : ''}`}>{value}</span>
    </div>
  );
}
