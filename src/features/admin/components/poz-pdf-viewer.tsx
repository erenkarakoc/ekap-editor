'use client';

import { useEffect, useRef, useState } from 'react';
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiExternalLinkLine,
  RiFilePdfLine,
  RiLoader4Line,
  RiRefreshLine,
  RiRotateLockLine,
  RiZoomInLine,
  RiZoomOutLine,
} from '@remixicon/react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

import { Alert, AlertDescription, AlertTitle } from '@shared/components/ui/alert';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Separator } from '@shared/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/components/ui/tooltip';

interface OnbellekKaydi {
  belge?: PDFDocumentProxy;
  yukleme?: PDFDocumentLoadingTask;
  promise: Promise<PDFDocumentProxy>;
  sonKullanim: number;
}

interface MetinParcasi {
  str: string;
  width: number;
  height: number;
  transform: number[];
}

interface IsaretKutusu {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface MetinKutusu extends IsaretKutusu {
  baseline: number;
}

const PDF_ONBELLEK_LIMITI = 3;
const pdfOnbellegi = new Map<string, OnbellekKaydi>();
let pdfJsPromise: Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> | null = null;

function mapUyumlulugunuSagla() {
  const prototype = Map.prototype as Map<unknown, unknown> & {
    getOrInsertComputed?: (key: unknown, callback: (key: unknown) => unknown) => unknown;
  };
  if (prototype.getOrInsertComputed) return;
  Object.defineProperty(Map.prototype, 'getOrInsertComputed', {
    configurable: true,
    value(this: Map<unknown, unknown>, key: unknown, callback: (key: unknown) => unknown) {
      if (this.has(key)) return this.get(key);
      const value = callback(key);
      this.set(key, value);
      return value;
    },
    writable: true,
  });
}

function pdfJsAl() {
  if (!pdfJsPromise) {
    mapUyumlulugunuSagla();
    pdfJsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
      return pdfjs;
    });
  }
  return pdfJsPromise;
}

function onbellektenCikar(anahtar: string) {
  const kayit = pdfOnbellegi.get(anahtar);
  pdfOnbellegi.delete(anahtar);
  if (kayit?.yukleme) void kayit.yukleme.destroy();
}

async function pdfBelgesiniAl(anahtar: string, url: string, zorlaYenile = false) {
  if (zorlaYenile) onbellektenCikar(anahtar);
  const mevcut = pdfOnbellegi.get(anahtar);
  if (mevcut) {
    mevcut.sonKullanim = Date.now();
    return mevcut.promise;
  }

  const kayit = {} as OnbellekKaydi;
  kayit.sonKullanim = Date.now();
  kayit.promise = (async () => {
    const pdfjs = await pdfJsAl();
    kayit.yukleme = pdfjs.getDocument({ url, withCredentials: true });
    const belge = await kayit.yukleme.promise;
    kayit.belge = belge;
    return belge;
  })();
  pdfOnbellegi.set(anahtar, kayit);

  try {
    const belge = await kayit.promise;
    const eskiler = [...pdfOnbellegi.entries()]
      .filter(([key]) => key !== anahtar)
      .sort(([, a], [, b]) => a.sonKullanim - b.sonKullanim);
    while (pdfOnbellegi.size > PDF_ONBELLEK_LIMITI && eskiler.length) {
      onbellektenCikar(eskiler.shift()![0]);
    }
    return belge;
  } catch (error) {
    if (pdfOnbellegi.get(anahtar) === kayit) pdfOnbellegi.delete(anahtar);
    throw error;
  }
}

function metniNormallestir(value: string) {
  return value.normalize('NFKC').toLocaleUpperCase('tr-TR').replace(/\s+/g, '');
}

function matrisleriCarp(a: number[], b: number[]) {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function pozIsaretiniBul(
  items: MetinParcasi[],
  pozNumarasi: string,
  viewport: { scale: number; transform: number[] },
): IsaretKutusu | null {
  const aranan = metniNormallestir(pozNumarasi);
  if (!aranan) return null;

  const kutular = items.map((item): MetinKutusu => {
    const transform = matrisleriCarp(viewport.transform, item.transform);
    const yukseklik = Math.max(
      Math.hypot(transform[2], transform[3]),
      item.height * viewport.scale,
      1,
    );
    return {
      left: transform[4],
      top: transform[5] - yukseklik,
      width: Math.max(item.width * viewport.scale, 1),
      height: yukseklik,
      baseline: transform[5],
    };
  });
  let eslesenKutular: MetinKutusu[] = [];

  for (let baslangic = 0; baslangic < items.length && !eslesenKutular.length; baslangic += 1) {
    if (!items[baslangic]?.str.trim()) continue;
    let birlesen = '';
    const adayKutular: MetinKutusu[] = [];
    const baslangicKutusu = kutular[baslangic];
    const satirToleransi = Math.max(2, baslangicKutusu.height * 0.45);

    for (let index = baslangic; index < Math.min(items.length, baslangic + 10); index += 1) {
      const item = items[index];
      const kutu = kutular[index];
      if (Math.abs(kutu.baseline - baslangicKutusu.baseline) > satirToleransi) break;
      if (!item?.str.trim()) continue;
      adayKutular.push(kutu);
      birlesen += metniNormallestir(item.str);
      if (birlesen.includes(aranan)) {
        eslesenKutular = adayKutular;
        break;
      }
      if (birlesen.length > aranan.length * 2.5) break;
    }
  }
  if (!eslesenKutular.length) return null;

  const left = Math.min(...eslesenKutular.map((kutu) => kutu.left));
  const top = Math.min(...eslesenKutular.map((kutu) => kutu.top));
  const right = Math.max(...eslesenKutular.map((kutu) => kutu.left + kutu.width));
  const bottom = Math.max(...eslesenKutular.map((kutu) => kutu.top + kutu.height));
  return {
    left: Math.max(0, left - 5),
    top: Math.max(0, top - 1),
    width: right - left + 10,
    height: bottom - top + 2,
  };
}

export function PozPdfViewer({
  url,
  belgeAnahtari,
  kaynakSayfa,
  kaynakUrl,
  pozNumarasi,
}: {
  url: string;
  belgeAnahtari: string;
  kaynakSayfa: number;
  kaynakUrl: string;
  pozNumarasi: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  const renderRef = useRef<RenderTask | null>(null);
  const [sayfa, setSayfa] = useState(kaynakSayfa);
  const [sayfaSayisi, setSayfaSayisi] = useState(0);
  const [olcek, setOlcek] = useState(1.15);
  const [donus, setDonus] = useState(0);
  const [durum, setDurum] = useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [hata, setHata] = useState('');
  const [yenileme, setYenileme] = useState(0);
  const [isaret, setIsaret] = useState<IsaretKutusu | null>(null);
  const [isaretDurumu, setIsaretDurumu] = useState<'bekliyor' | 'bulundu' | 'bulunamadi'>(
    'bekliyor',
  );

  useEffect(() => {
    let iptal = false;
    setDurum('yukleniyor');
    setHata('');
    void (async () => {
      try {
        const belge = await pdfBelgesiniAl(belgeAnahtari, url, yenileme > 0);
        if (iptal) return;
        documentRef.current = belge;
        setSayfaSayisi(belge.numPages);
        setDurum('hazir');
      } catch (error) {
        if (!iptal) {
          setDurum('hata');
          setHata(error instanceof Error ? error.message : 'PDF yüklenemedi.');
        }
      }
    })();
    return () => {
      iptal = true;
      renderRef.current?.cancel();
      documentRef.current = null;
    };
  }, [belgeAnahtari, url, yenileme]);

  useEffect(() => {
    if (!sayfaSayisi) return;
    setSayfa(Math.min(Math.max(kaynakSayfa, 1), sayfaSayisi));
  }, [kaynakSayfa, sayfaSayisi]);

  useEffect(() => {
    const belge = documentRef.current;
    const canvas = canvasRef.current;
    if (!belge || !canvas || durum !== 'hazir') return;
    let iptal = false;
    setIsaret(null);
    setIsaretDurumu('bekliyor');
    void (async () => {
      try {
        const pdfSayfasi = await belge.getPage(sayfa);
        if (iptal) return;
        const viewport = pdfSayfasi.getViewport({ scale: olcek, rotation: donus });
        const oran = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * oran);
        canvas.height = Math.floor(viewport.height * oran);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('PDF çizim yüzeyi oluşturulamadı.');
        renderRef.current?.cancel();
        const renderTask = pdfSayfasi.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: oran === 1 ? undefined : [oran, 0, 0, oran, 0, 0],
        });
        renderRef.current = renderTask;
        await renderTask.promise;
        if (iptal) return;
        if (sayfa !== kaynakSayfa) {
          setIsaretDurumu('bulunamadi');
          return;
        }
        const metin = await pdfSayfasi.getTextContent();
        if (iptal) return;
        const metinParcalari = metin.items.flatMap((item): MetinParcasi[] => {
          if (!('str' in item) || !Array.isArray(item.transform)) return [];
          return [
            {
              str: item.str,
              width: item.width,
              height: item.height,
              transform: item.transform,
            },
          ];
        });
        const kutu = pozIsaretiniBul(metinParcalari, pozNumarasi, viewport);
        setIsaret(kutu);
        setIsaretDurumu(kutu ? 'bulundu' : 'bulunamadi');
      } catch (error) {
        if (!iptal && !(error instanceof Error && error.name === 'RenderingCancelledException')) {
          setDurum('hata');
          setHata(error instanceof Error ? error.message : 'PDF sayfası çizilemedi.');
        }
      }
    })();
    return () => {
      iptal = true;
      renderRef.current?.cancel();
    };
  }, [donus, durum, kaynakSayfa, olcek, pozNumarasi, sayfa]);

  return (
    <section className="bg-muted/40 flex min-h-[560px] flex-col overflow-hidden rounded-xl border lg:h-[calc(100dvh-12rem)]">
      <div className="bg-background flex flex-wrap items-center gap-2 border-b p-2">
        <div className="mr-1 min-w-0 rounded-md bg-yellow-100 px-2 py-1 text-xs text-yellow-950 ring-1 ring-yellow-400/70 dark:bg-yellow-400/15 dark:text-yellow-100">
          <span className="font-medium">İncelenen poz:</span>{' '}
          <span className="font-mono font-semibold">{pozNumarasi}</span>
          <span className="text-yellow-800/80 dark:text-yellow-200/75"> · sayfa {kaynakSayfa}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={sayfa <= 1}
          onClick={() => setSayfa((deger) => Math.max(1, deger - 1))}
          aria-label="Önceki PDF sayfası"
        >
          <RiArrowLeftLine />
        </Button>
        <div className="flex items-center gap-1">
          <Input
            className="h-8 w-16 text-center tabular-nums"
            type="number"
            min={1}
            max={sayfaSayisi || 1}
            value={sayfa}
            aria-label="PDF sayfa numarası"
            onChange={(event) =>
              setSayfa(Math.min(Math.max(Number(event.target.value) || 1, 1), sayfaSayisi || 1))
            }
          />
          <span className="text-muted-foreground text-xs tabular-nums">/ {sayfaSayisi || '—'}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!sayfaSayisi || sayfa >= sayfaSayisi}
          onClick={() => setSayfa((deger) => Math.min(sayfaSayisi, deger + 1))}
          aria-label="Sonraki PDF sayfası"
        >
          <RiArrowRightLine />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ToolbarButton
          label="Uzaklaştır"
          onClick={() => setOlcek((deger) => Math.max(0.5, deger - 0.15))}
        >
          <RiZoomOutLine />
        </ToolbarButton>
        <span className="min-w-12 text-center text-xs tabular-nums">
          %{Math.round(olcek * 100)}
        </span>
        <ToolbarButton
          label="Yakınlaştır"
          onClick={() => setOlcek((deger) => Math.min(2, deger + 0.15))}
        >
          <RiZoomInLine />
        </ToolbarButton>
        <ToolbarButton
          label="Saat yönünde döndür"
          onClick={() => setDonus((deger) => (deger + 90) % 360)}
        >
          <RiRotateLockLine />
        </ToolbarButton>
        <Button type="button" variant="outline" size="sm" asChild className="ml-auto">
          <a href={kaynakUrl} target="_blank" rel="noreferrer">
            <RiExternalLinkLine data-icon="inline-start" /> Kaynağı aç
          </a>
        </Button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-auto p-4">
        {durum === 'yukleniyor' ? (
          <div className="flex min-h-96 items-center justify-center gap-2 text-sm">
            <RiLoader4Line className="animate-spin" aria-hidden="true" /> PDF yükleniyor…
          </div>
        ) : null}
        {durum === 'hata' ? (
          <Alert variant="destructive" className="mx-auto mt-8 max-w-lg">
            <RiFilePdfLine />
            <AlertTitle>PDF görüntülenemedi</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <span>{hata}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setYenileme((deger) => deger + 1)}
              >
                <RiRefreshLine data-icon="inline-start" /> Yeniden dene
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="relative mx-auto w-fit" hidden={durum !== 'hazir'}>
          <canvas
            ref={canvasRef}
            className="bg-background block shadow-sm"
            role="img"
            aria-label={`Kaynak PDF sayfa ${sayfa}; incelenen poz ${pozNumarasi}`}
          />
          {isaret && sayfa === kaynakSayfa ? (
            <div
              className="pointer-events-none absolute z-10 rounded-sm bg-yellow-300/45 mix-blend-multiply ring-2 ring-amber-500/80 transition-[top,left,width,height] duration-150 dark:mix-blend-normal"
              style={isaret}
              aria-hidden="true"
            >
              <span className="absolute -top-6 left-0 rounded bg-amber-600 px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white shadow-sm">
                {pozNumarasi}
              </span>
            </div>
          ) : null}
        </div>
        <p className="sr-only" aria-live="polite">
          {isaretDurumu === 'bulundu'
            ? `${pozNumarasi} numaralı poz PDF üzerinde işaretlendi.`
            : isaretDurumu === 'bulunamadi' && sayfa === kaynakSayfa
              ? `${pozNumarasi} numaralı pozun metin konumu PDF üzerinde bulunamadı.`
              : ''}
        </p>
      </div>
    </section>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="outline" size="icon-sm" onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
