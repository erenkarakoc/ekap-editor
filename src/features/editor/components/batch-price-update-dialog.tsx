'use client';

import React, { useState, useCallback } from 'react';
import { Calculator, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Label } from '@shared/components/ui/label';
import { Input } from '@shared/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@shared/components/ui/dialog';
import type { EkapDocument } from '@features/editor/lib/ekap-crypto';

interface BatchPriceUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: EkapDocument;
  onApply: (percentage: number, isIncrease: boolean) => void;
}

export function BatchPriceUpdateDialog({
  open,
  onOpenChange,
  document,
  onApply,
}: BatchPriceUpdateDialogProps) {
  const [percentage, setPercentage] = useState<string>('');
  const [isIncrease, setIsIncrease] = useState<boolean>(true);
  
  const handleApply = useCallback(() => {
    const val = parseFloat(percentage);
    if (isNaN(val) || val <= 0) return;
    
    onApply(val, isIncrease);
    onOpenChange(false);
    setPercentage('');
  }, [percentage, isIncrease, onApply, onOpenChange]);

  const itemCount = document.items.filter(i => !i.fiyatDecimal.isZero()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="size-5" />
            Toplu Fiyat Güncelle
          </DialogTitle>
          <DialogDescription>
            Tüm kalemlerin fiyatlarını yüzde(%) olarak artırabilir veya azaltabilirsiniz.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-3">
            <Label>İşlem Türü</Label>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="updateType"
                  checked={isIncrease}
                  onChange={() => setIsIncrease(true)}
                  className="accent-primary"
                />
                Fiyatları Artır
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="updateType"
                  checked={!isIncrease}
                  onChange={() => setIsIncrease(false)}
                  className="accent-primary"
                />
                Fiyatları Azalt
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="percentage">Yüzde Oranı (%)</Label>
            <Input
              id="percentage"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Örn: 10"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApply();
              }}
            />
          </div>

          <div className="bg-muted/50 flex gap-3 rounded-lg p-3 text-sm">
            <AlertTriangle className="text-amber-500 shrink-0 size-5" />
            <div>
              <p className="font-medium">Dikkat</p>
              <p className="text-muted-foreground mt-1">
                Fiyatı 0 (sıfır) olan kalemler hariç olmak üzere toplam {itemCount} kalemin fiyatı güncellenecektir.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={!percentage || isNaN(parseFloat(percentage)) || parseFloat(percentage) <= 0}
          >
            <Check className="mr-2 size-4" />
            Uygula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
