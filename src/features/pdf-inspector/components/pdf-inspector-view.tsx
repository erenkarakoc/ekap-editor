'use client';

import React, { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Copy, FileText, Loader2, Upload } from 'lucide-react';

import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { cn } from '@shared/lib/utils';
import { processPdf, type PdfProcessResult } from '@features/pdf-inspector/lib/pdf-inspector';

const PDF_TYPE_LABELS: Record<string, string> = {
  TextBased: 'Metin tabanlı',
  Scanned: 'Taranmış',
  ImageBased: 'Görsel tabanlı',
  Mixed: 'Karışık',
};

export function PdfInspectorView() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<PdfProcessResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Lütfen bir PDF dosyası seçin.');
      return;
    }

    setFileName(file.name);
    setResult(null);
    setError(null);
    setIsProcessing(true);

    try {
      const processed = await processPdf(file, { includePageMarkers: true });
      setResult(processed);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error('PDF işlenemedi', { description: message });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const handleCopy = useCallback(async () => {
    if (!result?.markdown) return;
    await navigator.clipboard.writeText(result.markdown);
    toast.success('Markdown panoya kopyalandı');
  }, [result]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="display-heading text-2xl">PDF Inspector</h1>
        <p className="text-muted-foreground text-sm">
          PDF tamamen tarayıcıda, WebAssembly ile çözümlenir. Dosya hiçbir sunucuya
          yüklenmez.
        </p>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors',
          isDragging ? 'border-primary bg-accent' : 'border-border hover:bg-accent/50',
        )}
      >
        {isProcessing ? (
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        ) : (
          <Upload className="text-muted-foreground size-8" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium">
            {isProcessing ? 'İşleniyor…' : 'PDF dosyasını sürükleyin veya seçin'}
          </p>
          {fileName && !isProcessing && (
            <p className="text-muted-foreground mt-1 flex items-center justify-center gap-1 text-xs">
              <FileText className="size-3" />
              {fileName}
            </p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = '';
          }}
        />
      </div>

      {error && (
        <div className="border-destructive/50 text-destructive flex items-start gap-2 rounded-md border p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Çözümleme sonucu</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <Stat label="Tür">
                <Badge variant={result.pdfType === 'TextBased' ? 'default' : 'secondary'}>
                  {PDF_TYPE_LABELS[result.pdfType] ?? result.pdfType}
                </Badge>
              </Stat>
              <Stat label="Sayfa">{result.pageCount}</Stat>
              <Stat label="Süre">{result.processingTimeMs} ms</Stat>
              <Stat label="Güven">{Math.round(result.confidence * 100)}%</Stat>
              <Stat label="OCR gereken sayfa">
                {result.pagesNeedingOcr.length > 0 ? result.pagesNeedingOcr.join(', ') : 'Yok'}
              </Stat>
              <Stat label="Tablo içeren sayfa">
                {result.layout.pagesWithTables.length > 0
                  ? result.layout.pagesWithTables.join(', ')
                  : 'Yok'}
              </Stat>
              <Stat label="Kodlama sorunu">
                {result.hasEncodingIssues ? 'Var' : 'Yok'}
              </Stat>
              <Stat label="Başlık">{result.title || '—'}</Stat>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Markdown</CardTitle>
              <Button variant="outline" size="sm" onClick={handleCopy} disabled={!result.markdown}>
                <Copy className="size-4" />
                Kopyala
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted max-h-[500px] overflow-auto rounded-md p-4 text-xs whitespace-pre-wrap">
                {result.markdown || 'Bu PDF metin içermiyor (OCR gerekiyor).'}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}
