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

export function ThresholdView() {
  const [ymStr, setYmStr] = useState('');
  const [nStr, setNStr] = useState('1,00');
  const [bids, setBids] = useState<BidRow[]>([
    { id: crypto.randomUUID(), name: '', amountStr: '' },
    { id: crypto.randomUUID(), name: '', amountStr: '' },
    { id: crypto.randomUUID(), name: '', amountStr: '' },
  ]);
  const [result, setResult] = useState<ThresholdResult | null>(null);

  const calculate = useCallback(() => {
    const ym = parseTurkishNumber(ymStr);
    if (ym.isZero()) return;

    const n = parseTurkishNumber(nStr);

    const validBids: Bid[] = bids
      .filter((b) => b.amountStr.trim() !== '')
      .map((b) => ({
        name: b.name || `İstekli ${bids.indexOf(b) + 1}`,
        amount: parseTurkishNumber(b.amountStr),
      }));

    if (validBids.length === 0) return;

    setResult(calculateThreshold(ym, n, validBids));
  }, [ymStr, nStr, bids]);

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
                <Label htmlFor="n">N Katsayısı</Label>
                <Input
                  id="n"
                  placeholder="1,00"
                  value={nStr}
                  onChange={(e) => setNStr(e.target.value.replace('.', ','))}
                  className="font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bid Table */}
        <Card>
          <CardContent className="pt-6">
            <BidTable bids={bids} results={result?.bids ?? null} onChange={setBids} />
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
            {/* Threshold Value + Winner */}
            <Card className="border-primary/50">
              <CardContent className="pt-6">
                <div className="space-y-2 text-center">
                  <p className="text-muted-foreground mb-1 text-sm">Sınır Değer</p>
                  <p className="text-primary font-mono text-3xl font-bold">
                    {formatTurkishNumber(result.thresholdValue)} TL
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Muhtemel Kazanan: </span>
                    <span className="font-semibold">{result.winner ?? '—'}</span>
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
                  <StepRow label="Katsayı: N" value={result.steps.n.toFixed(2)} />
                  <StepRow
                    label="Alt Sınır"
                    value={`${formatTurkishNumber(result.steps.lowerBound)} TL`}
                    desc="YM × %40"
                  />
                  <StepRow
                    label="Üst Sınır"
                    value={`${formatTurkishNumber(result.steps.upperBound)} TL`}
                    desc="YM × %120"
                  />
                  <StepRow
                    label="Aralıktaki teklif sayısı"
                    value={`${result.steps.validBids.length}`}
                  />
                  <StepRow
                    label="Ortalama-1"
                    value={`${formatTurkishNumber(result.steps.tort1)} TL`}
                    desc="Tort1"
                  />
                  <StepRow
                    label="Standart Sapma"
                    value={`${formatTurkishNumber(result.steps.stdDev)} TL`}
                    desc="σ (örneklem)"
                  />
                  <StepRow
                    label="Standart Sapma (Alt)"
                    value={`${formatTurkishNumber(result.steps.sigmaLower)} TL`}
                    desc="Tort1 − σ"
                  />
                  <StepRow
                    label="Standart Sapma (Üst)"
                    value={`${formatTurkishNumber(result.steps.sigmaUpper)} TL`}
                    desc="Tort1 + σ"
                  />
                  <StepRow
                    label="±1σ aralığındaki teklif sayısı"
                    value={`${result.steps.filteredBids.length}`}
                  />
                  <StepRow
                    label="Ortalama-2"
                    value={`${formatTurkishNumber(result.steps.tort2)} TL`}
                    desc="Tort2"
                  />
                  <StepRow label="C Değeri" value={result.steps.c.toFixed(3)} desc="Tort2 / YM" />
                  <StepRow
                    label="K Değeri"
                    value={result.steps.k.toFixed(3)}
                    desc={
                      result.steps.c.lt(new Decimal('0.60'))
                        ? 'C < 0,60 → K = C'
                        : result.steps.c.lte(new Decimal('1.00'))
                          ? '0,60 ≤ C ≤ 1,00 → K = (3,2C − C² − 0,6) / (C + 1)'
                          : 'C > 1,00 → K = (C² − 0,8C + 1,4) / (C + 1)'
                    }
                  />
                  <div className="border-t pt-2">
                    <StepRow
                      label="Sınır Değer (K × YM / N)"
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
        {desc && <span className="text-muted-foreground ml-2 text-xs">({desc})</span>}
      </div>
      <span className={`font-mono ${bold ? 'text-base font-bold' : ''}`}>{value}</span>
    </div>
  );
}
