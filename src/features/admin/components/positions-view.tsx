'use client';

import { useMemo, useState, useTransition } from 'react';
import { BookOpen, FileSearch, History, Loader2, PencilLine, Search } from 'lucide-react';
import { toast } from 'sonner';

import { pozDuzeltmeTaslagiAction } from '@features/admin/actions';
import type { AdminBolumVerisi, AdminPoz } from '@features/admin/types';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Card, CardContent } from '@shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { ScrollArea } from '@shared/components/ui/scroll-area';
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
import { InfrastructureAlert, SectionHeader } from './admin-primitives';

export function PositionsView({
  pozlar,
  initialSearch,
}: {
  pozlar: AdminBolumVerisi<AdminPoz[]>;
  initialSearch: string;
}) {
  const [secili, setSecili] = useState<AdminPoz | null>(null);
  const [duzelt, setDuzelt] = useState(false);
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
      <SectionHeader
        baslik="Poz yönetimi"
        aciklama="Kurum, kitap ve yayın bağlamında pozları; çoklu fiyatları, kaynak kanıtını ve etkin düzeltme katmanını inceleyin."
      />
      <InfrastructureAlert message={pozlar.uyari} />
      <form className="flex gap-2" action="/admin/pozlar">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            name="q"
            defaultValue={initialSearch}
            className="h-11 pl-10"
            placeholder="Poz numarası, tarif, kurum veya kitap ara"
            aria-label="Poz ara"
          />
        </div>
        <Button className="h-11" type="submit">
          <Search /> Ara
        </Button>
      </form>
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Poz</TableHead>
                <TableHead>Tanım</TableHead>
                <TableHead>Kurum / yayın</TableHead>
                <TableHead>Birim</TableHead>
                <TableHead>Fiyat</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Detay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pozlar.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground h-36 text-center">
                    {initialSearch
                      ? 'Aramanıza uyan poz bulunamadı.'
                      : 'Poz aramak için yukarıdaki alanı kullanın.'}
                  </TableCell>
                </TableRow>
              ) : (
                pozlar.data.map((poz) => (
                  <TableRow key={poz.poz_surumu_id}>
                    <TableCell className="font-mono font-semibold">{poz.poz_numarasi}</TableCell>
                    <TableCell>
                      <p className="line-clamp-2 max-w-xl whitespace-normal">{poz.tanim}</p>
                    </TableCell>
                    <TableCell>
                      <p>{poz.kurum ?? '—'}</p>
                      <p className="text-muted-foreground">{poz.yayin ?? poz.kitap ?? '—'}</p>
                    </TableCell>
                    <TableCell>{poz.birim ?? '—'}</TableCell>
                    <TableCell>
                      {poz.fiyatlar[0]
                        ? new Intl.NumberFormat('tr-TR', {
                            style: 'currency',
                            currency: poz.fiyatlar[0].para_birimi_kodu,
                          }).format(poz.fiyatlar[0].tutar)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {poz.duzeltme_var_mi ? (
                        <Badge variant="outline">Etkin düzeltme</Badge>
                      ) : (
                        <Badge variant="secondary">Kaynak değer</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSecili(poz)}>
                        <FileSearch /> İncele
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Sheet
        open={Boolean(secili)}
        onOpenChange={(open) => {
          if (!open) {
            setSecili(null);
            setDuzelt(false);
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-3xl">
          {secili && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle className="font-mono text-base">{secili.poz_numarasi}</SheetTitle>
                <SheetDescription>
                  {secili.kurum} · {secili.yayin}
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="min-h-0 flex-1 p-6">
                <Tabs defaultValue="detay">
                  <TabsList>
                    <TabsTrigger value="detay">Tarif ve analiz</TabsTrigger>
                    <TabsTrigger value="fiyat">Fiyat geçmişi</TabsTrigger>
                    <TabsTrigger value="kaynak">Kaynak kanıtı</TabsTrigger>
                  </TabsList>
                  <TabsContent value="detay" className="space-y-4">
                    <section className="rounded-xl border p-4">
                      <h3 className="text-sm font-medium">Etkin tanım</h3>
                      <p className="mt-2 text-sm leading-6">{secili.tanim}</p>
                    </section>
                    <section className="rounded-xl border p-4">
                      <h3 className="text-sm font-medium">Tarif</h3>
                      <p className="text-muted-foreground mt-2 text-sm leading-6 whitespace-pre-wrap">
                        {secili.tarif ?? 'Tarif kaydı bulunmuyor.'}
                      </p>
                    </section>
                    <JsonBlock data={secili.analiz} />
                  </TabsContent>
                  <TabsContent value="fiyat">
                    <div className="space-y-3 py-3">
                      {secili.fiyatlar.length === 0 ? (
                        <p className="text-muted-foreground">Fiyat kaydı yok.</p>
                      ) : (
                        secili.fiyatlar.map((fiyat) => (
                          <div
                            key={fiyat.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div>
                              <p className="font-medium">{fiyat.fiyat_turu}</p>
                              <p className="text-muted-foreground text-xs">
                                {fiyat.birim_ham ?? secili.birim}
                              </p>
                            </div>
                            <strong className="font-mono tabular-nums">
                              {new Intl.NumberFormat('tr-TR', {
                                style: 'currency',
                                currency: fiyat.para_birimi_kodu,
                              }).format(fiyat.tutar)}
                            </strong>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="kaynak">
                    <div className="rounded-xl border border-dashed p-6 text-center">
                      <BookOpen className="text-muted-foreground mx-auto size-8" />
                      <p className="mt-3 font-medium">PDF sayfa {secili.kaynak_sayfa ?? '—'}</p>
                      <p className="text-muted-foreground mt-1 text-xs break-all">
                        {secili.kaynak_belge_yolu ?? 'Kaynak belge yolu kaydedilmemiş.'}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </ScrollArea>
              <div className="border-t p-4">
                <Button className="w-full sm:w-auto" onClick={() => setDuzelt(true)}>
                  <PencilLine /> Düzeltme taslağı oluştur
                </Button>
              </div>
              <CorrectionDialog poz={secili} open={duzelt} onOpenChange={setDuzelt} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CorrectionDialog({
  poz,
  open,
  onOpenChange,
}: {
  poz: AdminPoz;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [tanim, setTanim] = useState(poz.tanim);
  const [birim, setBirim] = useState(poz.birim ?? '');
  const [fiyatlar, setFiyatlar] = useState(() => poz.fiyatlar.map((fiyat) => ({ ...fiyat })));
  const [gerekce, setGerekce] = useState('');
  const [isPending, startTransition] = useTransition();
  const degisiklikler = useMemo(
    () => ({
      ...(tanim !== poz.tanim ? { tanim } : {}),
      ...(birim !== (poz.birim ?? '') ? { birim } : {}),
    }),
    [birim, poz, tanim],
  );
  const fiyatDegisti = JSON.stringify(fiyatlar) !== JSON.stringify(poz.fiyatlar);
  function kaydet() {
    startTransition(async () => {
      const sonuc = await pozDuzeltmeTaslagiAction({
        pozSurumuId: poz.poz_surumu_id,
        temelHash: poz.temel_hash,
        degisiklikler,
        fiyatlar: fiyatDegisti ? fiyatlar : [],
        gerekce,
      });
      if (!sonuc.ok) {
        toast.error(sonuc.error);
        return;
      }
      toast.success('Sürümlü düzeltme inceleme kuyruğuna eklendi.');
      onOpenChange(false);
    });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Düzeltme taslağı · {poz.poz_numarasi}</DialogTitle>
          <DialogDescription>
            Kaynak satır değişmez. Taslak onaylandığında etkin görünümde uygulanır ve önceki sürüm
            korunur.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="duzeltme-tanim">Tanım</Label>
            <Textarea
              id="duzeltme-tanim"
              rows={5}
              value={tanim}
              onChange={(event) => setTanim(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duzeltme-birim">Birim</Label>
            <Input
              id="duzeltme-birim"
              className="h-10"
              value={birim}
              onChange={(event) => setBirim(event.target.value)}
            />
          </div>
          {fiyatlar.length > 0 && (
            <div className="space-y-2">
              <Label>Birim fiyat düzeltmeleri</Label>
              <div className="space-y-2 rounded-lg border p-3">
                {fiyatlar.map((fiyat, index) => (
                  <div key={fiyat.id} className="grid gap-2 sm:grid-cols-[1fr_140px_90px]">
                    <Input
                      aria-label={`${index + 1}. fiyat türü`}
                      value={fiyat.fiyat_turu}
                      onChange={(event) =>
                        setFiyatlar((rows) =>
                          rows.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, fiyat_turu: event.target.value } : row,
                          ),
                        )
                      }
                    />
                    <Input
                      aria-label={`${fiyat.fiyat_turu} tutarı`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={fiyat.tutar}
                      onChange={(event) =>
                        setFiyatlar((rows) =>
                          rows.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, tutar: Number(event.target.value) }
                              : row,
                          ),
                        )
                      }
                    />
                    <Input
                      aria-label={`${fiyat.fiyat_turu} para birimi`}
                      value={fiyat.para_birimi_kodu}
                      onChange={(event) =>
                        setFiyatlar((rows) =>
                          rows.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, para_birimi_kodu: event.target.value.toUpperCase() }
                              : row,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="duzeltme-gerekce">Gerekçe</Label>
            <Textarea
              id="duzeltme-gerekce"
              rows={4}
              value={gerekce}
              onChange={(event) => setGerekce(event.target.value)}
              placeholder="Kaynak sayfa, hata türü ve beklenen düzeltmeyi açıklayın."
            />
          </div>
          <div className="bg-muted rounded-lg p-3 text-xs">
            <p className="flex items-center gap-2 font-medium">
              <History className="size-3.5" />
              Değişiklik özeti
            </p>
            <pre className="mt-2 font-mono whitespace-pre-wrap">
              {JSON.stringify(degisiklikler, null, 2)}
              {fiyatDegisti ? `\n\nFiyatlar:\n${JSON.stringify(fiyatlar, null, 2)}` : ''}
            </pre>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button
            onClick={kaydet}
            disabled={
              isPending ||
              gerekce.trim().length < 10 ||
              (Object.keys(degisiklikler).length === 0 && !fiyatDegisti)
            }
          >
            {isPending ? <Loader2 className="animate-spin" /> : <PencilLine />} İncelemeye gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function JsonBlock({ data }: { data: Record<string, unknown> | null }) {
  return (
    <section className="rounded-xl border p-4">
      <h3 className="text-sm font-medium">Analiz</h3>
      <pre className="mt-3 max-h-80 overflow-auto font-mono text-xs whitespace-pre-wrap">
        {JSON.stringify(data ?? {}, null, 2)}
      </pre>
    </section>
  );
}
