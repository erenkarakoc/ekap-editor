'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Activity,
  Ban,
  Braces,
  Clock3,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  UnlockKeyhole,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  gorevKarariAction,
  gorevKilitleriniKurtarAction,
  gorevOlusturAction,
} from '@features/admin/actions';
import type { AdminBolumVerisi, AdminGorev, YonetimOlayi } from '@features/admin/types';
import { createClient } from '@shared/lib/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@shared/components/ui/alert-dialog';
import { Button } from '@shared/components/ui/button';
import { Card, CardContent } from '@shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@shared/components/ui/dialog';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { ScrollArea } from '@shared/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@shared/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Textarea } from '@shared/components/ui/textarea';
import { InfrastructureAlert, SectionHeader, StatusBadge, formatDate } from './admin-primitives';

const TERMINAL = new Set(['tamamlandi', 'basarisiz', 'iptal']);

export function OperationsView({ gorevler }: { gorevler: AdminBolumVerisi<AdminGorev[]> }) {
  const [arama, setArama] = useState('');
  const [durum, setDurum] = useState('tum');
  const [secili, setSecili] = useState<AdminGorev | null>(null);
  const [olaylar, setOlaylar] = useState<YonetimOlayi[]>([]);
  const [isPending, startTransition] = useTransition();
  const filtreli = useMemo(
    () =>
      gorevler.data.filter((gorev) => {
        const eslesiyor = `${gorev.tur} ${gorev.id}`
          .toLocaleLowerCase('tr-TR')
          .includes(arama.toLocaleLowerCase('tr-TR'));
        return eslesiyor && (durum === 'tum' || gorev.durum === durum);
      }),
    [arama, durum, gorevler.data],
  );
  const bayatGorevVar = useMemo(
    () => gorevler.data.some((gorev) => gorev.bayat_mi),
    [gorevler.data],
  );

  useEffect(() => {
    if (!secili) return;
    const supabase = createClient();
    let aktif = true;
    void supabase
      .from('yonetim_olaylari')
      .select('*')
      .eq('gorev_id', secili.id)
      .order('sira_no')
      .then(({ data }) => {
        if (aktif) setOlaylar((data ?? []) as YonetimOlayi[]);
      });
    const channel = supabase
      .channel(`admin-gorev-${secili.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'yonetim_olaylari',
          filter: `gorev_id=eq.${secili.id}`,
        },
        (payload) =>
          setOlaylar((onceki) =>
            [...onceki, payload.new as YonetimOlayi].sort((a, b) => a.sira_no - b.sira_no),
          ),
      )
      .subscribe();
    return () => {
      aktif = false;
      void supabase.removeChannel(channel);
    };
  }, [secili]);

  function karar(kararTuru: 'iptal' | 'yeniden_dene') {
    if (!secili) return;
    startTransition(async () => {
      const sonuc = await gorevKarariAction({
        id: secili.id,
        karar: kararTuru,
        gerekce: 'Yönetim merkezi üzerinden admin kararı',
      });
      if (sonuc.ok) toast.success('Görev kararı kaydedildi.');
      else toast.error(sonuc.error);
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
      <SectionHeader
        baslik="Operasyonlar"
        aciklama="Görev ağacını filtreleyin, canlı işlem olaylarını izleyin ve kontrollü müdahale edin."
        actions={<YeniGorevDialog />}
      />
      <InfrastructureAlert message={gorevler.uyari} />
      {bayatGorevVar && <StaleTaskAlert />}
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-3 border-b p-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              className="h-10 pl-9"
              value={arama}
              onChange={(event) => setArama(event.target.value)}
              placeholder="Görev türü veya kimliği ara"
              aria-label="Görevlerde ara"
            />
          </div>
          <Select value={durum} onValueChange={setDurum}>
            <SelectTrigger className="h-10 w-full md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="tum">Tüm durumlar</SelectItem>
                {[
                  'bekliyor',
                  'calisiyor',
                  'insan_bekliyor',
                  'tamamlandi',
                  'basarisiz',
                  'iptal',
                ].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item.replaceAll('_', ' ')}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-10" onClick={() => location.reload()}>
            <RefreshCw /> Yenile
          </Button>
        </div>
        <CardContent className="p-0">
          <VirtualTaskTable rows={filtreli} onSelect={setSecili} />
        </CardContent>
      </Card>

      <Sheet open={Boolean(secili)} onOpenChange={(acik) => !acik && setSecili(null)}>
        <SheetContent className="w-full sm:max-w-2xl">
          {secili && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Activity className="size-4" />
                  {secili.tur}
                </SheetTitle>
                <SheetDescription className="font-mono">{secili.id}</SheetDescription>
              </SheetHeader>
              <Tabs defaultValue="akis" className="min-h-0 flex-1 px-6 pb-6">
                <TabsList className="mt-4">
                  <TabsTrigger value="akis">Canlı akış</TabsTrigger>
                  <TabsTrigger value="veri">Girdi / sonuç</TabsTrigger>
                </TabsList>
                <TabsContent value="akis" className="min-h-0">
                  <ScrollArea className="h-[calc(100vh-230px)] pr-3">
                    <div className="space-y-3 py-3" aria-live="polite">
                      {olaylar.length === 0 ? (
                        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                          Bu görev için henüz olay yayınlanmadı.
                        </p>
                      ) : (
                        olaylar.map((olay) => (
                          <div key={olay.id} className="grid grid-cols-[24px_1fr] gap-3">
                            <div className="bg-muted mt-1 flex size-6 items-center justify-center rounded-full">
                              <Clock3 className="size-3" />
                            </div>
                            <div className="min-w-0 rounded-lg border p-3">
                              <div className="flex items-center justify-between gap-3">
                                <strong className="text-xs">{olay.baslik ?? olay.olay_turu}</strong>
                                <span className="text-muted-foreground text-[10px] tabular-nums">
                                  #{olay.sira_no}
                                </span>
                              </div>
                              {olay.icerik && (
                                <pre className="mt-2 font-mono text-xs leading-5 break-words whitespace-pre-wrap">
                                  {olay.icerik}
                                </pre>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="veri">
                  <ScrollArea className="h-[calc(100vh-250px)]">
                    <JsonBlock baslik="Girdi" value={secili.girdi_json} />
                    <JsonBlock baslik="Sonuç" value={secili.sonuc_json} />
                    {secili.hata_mesaji && (
                      <div className="border-destructive/30 bg-destructive/5 text-destructive mt-4 rounded-lg border p-3">
                        {secili.hata_mesaji}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
              <div className="flex flex-wrap justify-end gap-2 border-t p-4">
                {!TERMINAL.has(secili.durum) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={isPending}>
                        <Ban /> İptal et
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Görev iptal edilsin mi?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Çalışan worker ilk güvenli kesme noktasında görevi bırakır; olay ve işlem
                          kayıtları korunur.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <AlertDialogAction onClick={() => karar('iptal')}>
                          İptal et
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {['basarisiz', 'iptal'].includes(secili.durum) && (
                  <Button onClick={() => karar('yeniden_dene')} disabled={isPending}>
                    {isPending ? <Loader2 className="animate-spin" /> : <RotateCcw />} Yeniden dene
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function VirtualTaskTable({
  rows,
  onSelect,
}: {
  rows: AdminGorev[];
  onSelect: (row: AdminGorev) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual intentionally exposes imperative measurement callbacks.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 57,
    overscan: 8,
  });
  const items = virtualizer.getVirtualItems();
  return (
    <div ref={containerRef} className="max-h-[620px] overflow-auto">
      <Table className="min-w-[920px] table-fixed">
        <TableHeader className="bg-background sticky top-0 z-10">
          <TableRow>
            <TableHead className="w-[34%]">Görev</TableHead>
            <TableHead className="w-[16%]">Durum</TableHead>
            <TableHead className="w-[10%]">Öncelik</TableHead>
            <TableHead className="w-[10%]">Deneme</TableHead>
            <TableHead className="w-[20%]">Başlangıç</TableHead>
            <TableHead className="w-[10%] text-right">Süreç</TableHead>
          </TableRow>
        </TableHeader>
        {rows.length === 0 ? (
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground h-32 text-center">
                Filtreye uyan görev yok.
              </TableCell>
            </TableRow>
          </TableBody>
        ) : (
          <TableBody className="relative block" style={{ height: virtualizer.getTotalSize() }}>
            {items.map((item) => {
              const gorev = rows[item.index];
              return (
                <TableRow
                  key={gorev.id}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 flex w-full cursor-pointer items-center"
                  style={{ transform: `translateY(${item.start}px)` }}
                  tabIndex={0}
                  onClick={() => onSelect(gorev)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(gorev);
                    }
                  }}
                >
                  <TableCell className="w-[34%]">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{gorev.tur}</p>
                      <p className="text-muted-foreground truncate font-mono text-[11px]">
                        {gorev.id}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="w-[16%]">
                    <StatusBadge durum={gorev.durum} />
                  </TableCell>
                  <TableCell className="w-[10%] tabular-nums">{gorev.oncelik}</TableCell>
                  <TableCell className="w-[10%] tabular-nums">
                    {gorev.deneme_sayisi}/{gorev.maks_deneme}
                  </TableCell>
                  <TableCell className="w-[20%]">
                    {formatDate(gorev.baslama_tarihi ?? gorev.olusturma_tarihi)}
                  </TableCell>
                  <TableCell className="w-[10%] text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(gorev);
                      }}
                    >
                      İncele
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        )}
      </Table>
    </div>
  );
}

function JsonBlock({ baslik, value }: { baslik: string; value: unknown }) {
  return (
    <section className="mt-4">
      <h3 className="mb-2 text-sm font-medium">{baslik}</h3>
      <pre className="bg-muted overflow-x-auto rounded-lg p-3 font-mono text-xs leading-5">
        {JSON.stringify(value ?? {}, null, 2)}
      </pre>
    </section>
  );
}

function YeniGorevDialog() {
  const [open, setOpen] = useState(false);
  const [tur, setTur] = useState('belge_isle');
  const [girdi, setGirdi] = useState('{}');
  const [isPending, startTransition] = useTransition();
  function kaydet() {
    startTransition(async () => {
      try {
        const parsed = JSON.parse(girdi) as Record<string, unknown>;
        const sonuc = await gorevOlusturAction({ tur, girdi: parsed, oncelik: 100, maksDeneme: 3 });
        if (!sonuc.ok) {
          toast.error(sonuc.error);
          return;
        }
        toast.success('Görev kuyruğa eklendi.');
        setOpen(false);
      } catch {
        toast.error('Girdi geçerli bir JSON nesnesi olmalı.');
      }
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Play /> Yeni görev
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni görev oluştur</DialogTitle>
          <DialogDescription>
            Görev Supabase kuyruğuna eklenir; uygun worker heartbeat sonrasında sahiplenir.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gorev-turu">Görev türü</Label>
            <Select value={tur} onValueChange={setTur}>
              <SelectTrigger id="gorev-turu" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {[
                    'belge_isle',
                    'sayfa_isle',
                    'poz_normalize',
                    'analiz_normalize',
                    'gorsel_dogrula',
                  ].map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gorev-girdi">Girdi JSON</Label>
            <Textarea
              id="gorev-girdi"
              value={girdi}
              onChange={(event) => setGirdi(event.target.value)}
              rows={10}
              className="font-mono"
              spellCheck={false}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Vazgeç
          </Button>
          <Button onClick={kaydet} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Braces />} Kuyruğa ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StaleTaskAlert() {
  const [isPending, startTransition] = useTransition();
  function recover() {
    startTransition(async () => {
      const sonuc = await gorevKilitleriniKurtarAction({ kilitSuresiSn: 900 });
      if (sonuc.ok) toast.success('Süresi dolmuş görev kilitleri yeniden kuyruğa alındı.');
      else toast.error(sonuc.error);
    });
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">Süresi dolmuş görev kilidi algılandı</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Bayatlık kararı RPC tarafından kilit veya başlangıç zamanına göre 15 dakikalık eşikle
          üretildi.
        </p>
      </div>
      <Button variant="outline" onClick={recover} disabled={isPending}>
        {isPending ? <Loader2 className="animate-spin" /> : <UnlockKeyhole />}
        Kilitleri kurtar
      </Button>
    </div>
  );
}
