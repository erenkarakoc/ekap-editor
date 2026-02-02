'use client';

import React, { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { EkapDocument } from '@/lib/ekap-crypto';
import { formatTurkishNumber } from '@/lib/ekap-crypto';
import {
  parseExcelFile,
  matchExcelToItems,
  getColumnLetter,
  type ParsedExcel,
  type PriceUpdate,
  type MatchResult,
} from '@/lib/excel-parser';

interface UploadPricesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: EkapDocument;
  onApply: (updates: PriceUpdate[], overriddenItems: Map<number, string>) => void;
}

type Step = 'upload' | 'column-mapping' | 'preview';

export function UploadPricesDialog({
  open,
  onOpenChange,
  document,
  onApply,
}: UploadPricesDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedExcel, setParsedExcel] = useState<ParsedExcel | null>(null);
  const [keyColumnIndex, setKeyColumnIndex] = useState<number>(0);
  const [priceColumnIndex, setPriceColumnIndex] = useState<number>(1);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep('upload');
    setFile(null);
    setParsedExcel(null);
    setKeyColumnIndex(0);
    setPriceColumnIndex(1);
    setMatchResult(null);
    setError(null);
    setIsDragging(false);
  }, []);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        resetState();
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, resetState],
  );

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const parsed = await parseExcelFile(selectedFile);
      if (parsed.rows.length < 2) {
        setError('Excel dosyasında yeterli veri bulunamadı.');
        setIsLoading(false);
        return;
      }
      setFile(selectedFile);
      setParsedExcel(parsed);
      setStep('column-mapping');
    } catch (err) {
      setError('Excel dosyası okunamadı. Lütfen geçerli bir Excel dosyası seçin.');
      console.error('Excel parse error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        const ext = droppedFile.name.split('.').pop()?.toLowerCase();
        if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
          handleFileSelect(droppedFile);
        } else {
          setError('Lütfen .xlsx, .xls veya .csv dosyası seçin.');
        }
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect],
  );

  const handleColumnMappingNext = useCallback(() => {
    if (!parsedExcel) return;

    const result = matchExcelToItems(
      parsedExcel,
      document.items,
      'siraNo',
      keyColumnIndex,
      priceColumnIndex,
    );

    setMatchResult(result);
    setStep('preview');
  }, [parsedExcel, document.items, keyColumnIndex, priceColumnIndex]);

  const handleApply = useCallback(() => {
    if (!matchResult) return;

    // Create map of overridden items (items that had non-zero prices)
    const overriddenItems = new Map<number, string>();
    for (const update of matchResult.updates) {
      if (!update.currentPrice.isZero()) {
        overriddenItems.set(update.itemIndex, formatTurkishNumber(update.currentPrice));
      }
    }

    onApply(matchResult.updates, overriddenItems);
    handleOpenChange(false);
    toast.success(`${matchResult.updates.length} satır fiyatı güncellendi`);
  }, [matchResult, onApply, handleOpenChange]);

  const handleBack = useCallback(() => {
    if (step === 'column-mapping') {
      setStep('upload');
      setFile(null);
      setParsedExcel(null);
    } else if (step === 'preview') {
      setStep('column-mapping');
      setMatchResult(null);
    }
  }, [step]);

  const overrideCount = matchResult?.updates.filter((u) => !u.currentPrice.isZero()).length ?? 0;

  // Block all drag events from reaching the dashboard behind the dialog
  const stopDragPropagation = useCallback((e: React.DragEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-2xl"
        onDragEnter={stopDragPropagation}
        onDragOver={stopDragPropagation}
        onDragLeave={stopDragPropagation}
        onDrop={stopDragPropagation}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5" />
            Excel&apos;den Fiyat Yükle
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Excel dosyanızı yükleyin'}
            {step === 'column-mapping' && 'Excel sütunlarını eşleyin'}
            {step === 'preview' && 'Değişiklikleri onaylayın'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Step 1: File Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className={cn(
                  'cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <Upload className="text-muted-foreground mx-auto mb-4 size-12" />
                <p className="text-muted-foreground mb-2 text-sm">
                  Excel dosyasını sürükleyin veya tıklayın
                </p>
                <p className="text-muted-foreground text-xs">.xlsx, .xls, .csv</p>
              </div>

              <p className="text-muted-foreground flex items-center justify-center gap-1 text-center text-xs">
                <Info className="size-3" />
                Sıra No ve Fiyat sütunlarını içeren bir Excel dosyası seçin.
              </p>

              {isLoading && (
                <p className="text-muted-foreground text-center text-sm">Dosya okunuyor...</p>
              )}

              {error && (
                <div className="text-destructive flex items-center gap-2 text-sm">
                  <AlertTriangle className="size-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'column-mapping' && parsedExcel && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sıra No Sütunu</Label>
                  <select
                    value={keyColumnIndex}
                    onChange={(e) => setKeyColumnIndex(Number(e.target.value))}
                    className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                  >
                    {parsedExcel.headers.map((header, idx) => (
                      <option key={idx} value={idx}>
                        {getColumnLetter(idx)}: {header || '(boş)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Birim Fiyat Sütunu</Label>
                  <select
                    value={priceColumnIndex}
                    onChange={(e) => setPriceColumnIndex(Number(e.target.value))}
                    className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                  >
                    {parsedExcel.headers.map((header, idx) => (
                      <option key={idx} value={idx}>
                        {getColumnLetter(idx)}: {header || '(boş)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview first few rows */}
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium">Önizleme (ilk 5 satır)</p>
                <div className="max-h-48 overflow-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="border-b px-3 py-2 text-left font-medium">Satır</th>
                        <th className="border-b px-3 py-2 text-left font-medium">Sıra No</th>
                        <th className="border-b px-3 py-2 text-left font-medium">Birim Fiyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedExcel.rows.slice(1, 6).map((row, idx) => (
                        <tr key={idx} className="border-b last:border-b-0">
                          <td className="text-muted-foreground px-3 py-2">{row.rowIndex + 1}</td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {row.cells[keyColumnIndex] || '-'}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {row.cells[priceColumnIndex] || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && matchResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-green-500" />
                  <span>{matchResult.updates.length} satır eşleştirildi</span>
                </div>
                {overrideCount > 0 && (
                  <div className="flex items-center gap-2 text-amber-500">
                    <AlertTriangle className="size-4" />
                    <span>{overrideCount} satırda fiyat değişecek</span>
                  </div>
                )}
                {matchResult.unmatchedExcelRows.length > 0 && (
                  <div className="text-muted-foreground">
                    {matchResult.unmatchedExcelRows.length} satır eşleşmedi
                  </div>
                )}
                {matchResult.invalidPriceRows.length > 0 && (
                  <div className="text-muted-foreground">
                    {matchResult.invalidPriceRows.length} satırda geçersiz fiyat
                  </div>
                )}
              </div>

              {matchResult.updates.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  <AlertTriangle className="mx-auto mb-4 size-12 text-amber-500" />
                  <p>Eşleşen satır bulunamadı.</p>
                  <p className="mt-2 text-sm">
                    Lütfen eşleştirme alanını ve sütunları kontrol edin.
                  </p>
                </div>
              ) : (
                <div className="max-h-64 overflow-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="border-b px-3 py-2 text-left font-medium">#</th>
                        <th className="border-b px-3 py-2 text-left font-medium">Poz No</th>
                        <th className="border-b px-3 py-2 text-left font-medium">Açıklama</th>
                        <th className="border-b px-3 py-2 text-right font-medium">Mevcut Fiyat</th>
                        <th className="border-b px-3 py-2 text-right font-medium">Yeni Fiyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchResult.updates.map((update, idx) => {
                        const isOverride = !update.currentPrice.isZero();
                        return (
                          <tr
                            key={idx}
                            className={cn(
                              'border-b last:border-b-0',
                              isOverride && 'bg-amber-500/10',
                            )}
                          >
                            <td className="text-muted-foreground px-3 py-2">{update.siraNo}</td>
                            <td className="px-3 py-2 font-mono text-xs">{update.isKalemiNo}</td>
                            <td
                              className="max-w-[200px] truncate px-3 py-2"
                              title={update.aciklama}
                            >
                              {update.aciklama}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              <span className={cn(isOverride && 'text-amber-600')}>
                                {formatTurkishNumber(update.currentPrice)}
                                {isOverride && (
                                  <AlertTriangle className="ml-1 inline size-3 text-amber-500" />
                                )}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-medium">
                              {formatTurkishNumber(update.newPrice)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step !== 'upload' && (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="mr-1 size-4" />
              Geri
            </Button>
          )}

          <div className="flex-1" />

          {step === 'column-mapping' && (
            <Button onClick={handleColumnMappingNext}>
              Önizle
              <ChevronRight className="ml-1 size-4" />
            </Button>
          )}

          {step === 'preview' && matchResult && matchResult.updates.length > 0 && (
            <Button onClick={handleApply}>
              <Check className="mr-1 size-4" />
              Uygula ({matchResult.updates.length} satır)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
