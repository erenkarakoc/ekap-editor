'use client';

import { Fragment, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileSearch,
  History,
  Layers3,
  Loader2,
  PencilLine,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

import { pozDuzeltmeTaslagiAction } from '@features/admin/actions';
import type {
  AdminBolumVerisi,
  PozDetayi,
  PozFiltresi,
  PozFiltreSecenekleri,
  PozGezginiSonucu,
} from '@features/admin/types';
import { Alert, AlertDescription, AlertTitle } from '@shared/components/ui/alert';
import { Badge } from '@shared/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@shared/components/ui/breadcrumb';
import { Button } from '@shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/components/ui/card';
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
import { Switch } from '@shared/components/ui/switch';
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
import { cn } from '@shared/lib/utils';
import { InfrastructureAlert, SectionHeader } from './admin-primitives';

const KAYIT_TURLERI = [
  ['unit_price', 'Birim fiyat'],
  ['rayic', 'Rayiç'],
  ['karsiz', 'Kârsız'],
  ['bolum_basligi', 'Bölüm başlığı'],
  ['analysis_header', 'Analiz başlığı'],
  ['other', 'Diğer'],
] as const;

export function PositionsView({
  pozlar,
  detay,
  initialFilters,
  secenekler,
}: {
  pozlar: AdminBolumVerisi<PozGezginiSonucu>;
  detay: AdminBolumVerisi<PozDetayi | null>;
  initialFilters: PozFiltresi;
  secenekler: PozFiltreSecenekleri;
}) {
  const router = useRouter();
  const [duzelt, setDuzelt] = useState(false);
  const [arama, setArama] = useState(initialFilters.arama);
  const [kurumId, setKurumId] = useState(initialFilters.kurumId ?? 'tum');
  const [yayinId, setYayinId] = useState(initialFilters.yayinId ?? 'tum');
  const [kayitTuru, setKayitTuru] = useState(initialFilters.kayitTuru ?? 'tum');
  const [birimKodu, setBirimKodu] = useState(initialFilters.birimKodu ?? 'tum');
  const [basliklariGoster, setBasliklariGoster] = useState(initialFilters.basliklariGoster);
  const yayinlar = secenekler.yayinlar.filter(
    (yayin) => kurumId === 'tum' || yayin.kurum_id === kurumId,
  );
  const filtreHazir = Boolean(initialFilters.kurumId || initialFilters.yayinId);

  function filtreParametreleri(ek: Record<string, string | null> = {}) {
    const params = new URLSearchParams();
    if (initialFilters.arama) params.set('q', initialFilters.arama);
    if (initialFilters.kurumId) params.set('kurum', initialFilters.kurumId);
    if (initialFilters.yayinId) params.set('yayin', initialFilters.yayinId);
    if (initialFilters.kayitTuru) params.set('tur', initialFilters.kayitTuru);
    if (initialFilters.birimKodu) params.set('birim', initialFilters.birimKodu);
    if (initialFilters.basliklariGoster) params.set('baslik', '1');
    if (initialFilters.offset > 0) params.set('offset', String(initialFilters.offset));
    for (const [anahtar, deger] of Object.entries(ek)) {
      if (deger == null) params.delete(anahtar);
      else params.set(anahtar, deger);
    }
    return params;
  }

  function ara(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (arama.trim()) params.set('q', arama.trim());
    if (kurumId !== 'tum') params.set('kurum', kurumId);
    if (yayinId !== 'tum') params.set('yayin', yayinId);
    if (kayitTuru !== 'tum') params.set('tur', kayitTuru);
    if (birimKodu !== 'tum') params.set('birim', birimKodu);
    if (basliklariGoster) params.set('baslik', '1');
    router.push(`/admin/pozlar?${params.toString()}`);
  }

  function detayKapat() {
    router.push(`/admin/pozlar?${filtreParametreleri({ poz: null }).toString()}`);
    setDuzelt(false);
  }

  const oncekiOffset = Math.max(0, initialFilters.offset - initialFilters.limit);
  const sonrakiOffset = initialFilters.offset + initialFilters.limit;
  const aralikBasi = pozlar.data.kayitlar.length ? initialFilters.offset + 1 : 0;
  const aralikSonu = initialFilters.offset + pozlar.data.kayitlar.length;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 p-4 sm:p-6">
      <SectionHeader
        baslik="Poz gezgini"
        aciklama="Kurum ve yayın bağlamında pozları, başlık zincirini, kaynak birimleri ve fiyatları kayıpsız inceleyin."
      />
      <InfrastructureAlert message={pozlar.uyari ?? detay.uyari} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Arama kapsamı</CardTitle>
          <CardDescription>
            Büyük veri görünümünü korumak için en az kurum veya yayın seçilmelidir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_210px_270px_175px_175px_auto]"
            onSubmit={ara}
          >
            <div className="relative lg:col-span-2 xl:col-span-1">
              <Search
                className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                value={arama}
                onChange={(event) => setArama(event.target.value)}
                className="h-11 pl-10"
                placeholder="Ham/normalize kod, tanım veya başlık yolu"
                aria-label="Poz ara"
              />
            </div>
            <Select
              value={kurumId}
              onValueChange={(value) => {
                setKurumId(value);
                setYayinId('tum');
              }}
            >
              <SelectTrigger className="h-11 w-full" aria-label="Kurum filtresi">
                <SelectValue placeholder="Kurum seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="tum">Kurum seçin</SelectItem>
                  {secenekler.kurumlar.map((kurum) => (
                    <SelectItem key={kurum.id} value={kurum.id}>
                      {kurum.ad}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={yayinId} onValueChange={setYayinId}>
              <SelectTrigger className="h-11 w-full" aria-label="Yayın filtresi">
                <SelectValue placeholder="Yayın seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="tum">Yayın seçin</SelectItem>
                  {yayinlar.map((yayin) => (
                    <SelectItem key={yayin.id} value={yayin.id}>
                      {yayin.baslik}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={kayitTuru} onValueChange={setKayitTuru}>
              <SelectTrigger className="h-11 w-full" aria-label="Kayıt türü filtresi">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="tum">Tüm kayıt türleri</SelectItem>
                  {KAYIT_TURLERI.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={birimKodu} onValueChange={setBirimKodu}>
              <SelectTrigger className="h-11 w-full" aria-label="Birim filtresi">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="tum">Tüm birimler</SelectItem>
                  {secenekler.birimler.map((birim) => (
                    <SelectItem key={birim.kod} value={birim.kod}>
                      {birim.ad} · {birim.kod}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button className="h-11" type="submit">
              <Search data-icon="inline-start" /> Ara
            </Button>
            <div className="flex min-h-11 items-center gap-3 rounded-lg border px-3 lg:col-span-2 xl:col-span-6">
              <Switch
                id="bolum-basliklarini-goster"
                checked={basliklariGoster}
                onCheckedChange={setBasliklariGoster}
              />
              <Label htmlFor="bolum-basliklarini-goster" className="cursor-pointer font-normal">
                <span className="block text-sm font-medium">Bölüm başlıklarını göster</span>
                <span className="text-muted-foreground block text-xs">
                  Varsayılan listede bölüm başlıkları gizlidir; yüzde birimli pozlar başlık
                  sayılmaz.
                </span>
              </Label>
            </div>
          </form>
        </CardContent>
      </Card>

      {!filtreHazir ? (
        <Alert>
          <Layers3 />
          <AlertTitle>Kapsam seçimi gerekiyor</AlertTitle>
          <AlertDescription>
            Poz listesini açmak için kurum veya yayın seçin. Bu koruma, filtrelenmemiş fiyat
            görünümünün zaman aşımına uğramasını engeller.
          </AlertDescription>
        </Alert>
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Poz kayıtları</CardTitle>
                <CardDescription>
                  {pozlar.data.toplam.toLocaleString('tr-TR')} kaydın{' '}
                  {aralikBasi.toLocaleString('tr-TR')}–{aralikSonu.toLocaleString('tr-TR')} aralığı
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild={initialFilters.offset > 0}
                  disabled={initialFilters.offset === 0}
                >
                  {initialFilters.offset > 0 ? (
                    <Link
                      href={`/admin/pozlar?${filtreParametreleri({
                        offset: oncekiOffset ? String(oncekiOffset) : null,
                      }).toString()}`}
                    >
                      <ArrowLeft data-icon="inline-start" /> Önceki
                    </Link>
                  ) : (
                    <span>
                      <ArrowLeft data-icon="inline-start" /> Önceki
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild={sonrakiOffset < pozlar.data.toplam}
                  disabled={sonrakiOffset >= pozlar.data.toplam}
                >
                  {sonrakiOffset < pozlar.data.toplam ? (
                    <Link
                      href={`/admin/pozlar?${filtreParametreleri({
                        offset: String(sonrakiOffset),
                      }).toString()}`}
                    >
                      Sonraki <ArrowRight data-icon="inline-end" />
                    </Link>
                  ) : (
                    <span>
                      Sonraki <ArrowRight data-icon="inline-end" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table className="min-w-[1080px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Poz</TableHead>
                  <TableHead>Başlık yolu / tanım</TableHead>
                  <TableHead>Kurum / yayın</TableHead>
                  <TableHead>Birim</TableHead>
                  <TableHead>Fiyatlar</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead className="text-right">Detay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pozlar.data.kayitlar.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground h-36 text-center">
                      Bu kapsam ve filtrelerle eşleşen poz bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  pozlar.data.kayitlar.map((poz) => (
                    <TableRow key={poz.poz_surumu_id}>
                      <TableCell>
                        <p className="font-mono font-semibold">{poz.kod_ham}</p>
                        <p className="text-muted-foreground font-mono text-[11px]">
                          {poz.kod_normalize}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-xl">
                        <PozBreadcrumb value={poz.tanim_on_eki} />
                        <p className="mt-1 line-clamp-2 whitespace-normal">{poz.tanim_ham}</p>
                      </TableCell>
                      <TableCell>
                        <p>{poz.kurum_adi}</p>
                        <p className="text-muted-foreground max-w-72 truncate text-xs">
                          {poz.yayin_basligi}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p>{poz.birim_ham ?? '—'}</p>
                        <p className="text-muted-foreground font-mono text-xs">
                          {poz.birim_kodu ?? 'eşlenmedi'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-40 flex-col gap-1.5">
                          {poz.fiyatlar.length ? (
                            poz.fiyatlar.map((fiyat, index) => (
                              <div key={`${fiyat.fiyat_turu}-${fiyat.tutar}-${index}`}>
                                <p
                                  className={cn(
                                    'font-medium tabular-nums',
                                    fiyat.tutar < 0 && 'text-destructive',
                                  )}
                                >
                                  {paraBicimle(fiyat.tutar, fiyat.para_birimi_kodu)}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {fiyatTuruEtiketi(fiyat.fiyat_turu)} · /
                                  {fiyat.birim_ham ?? 'birim kaydedilmemiş'}
                                </p>
                              </div>
                            ))
                          ) : (
                            <span className="text-muted-foreground">Fiyat yok</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{kayitTuruEtiketi(poz.kayit_turu)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/admin/pozlar/${poz.poz_surumu_id}/incele?${filtreParametreleri({ poz: null }).toString()}`}
                          >
                            <FileSearch data-icon="inline-start" /> PDF ile incele
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Sheet open={Boolean(detay.data)} onOpenChange={(open) => !open && detayKapat()}>
        <SheetContent className="w-full sm:max-w-4xl">
          {detay.data ? <PozDetail poz={detay.data} onCorrect={() => setDuzelt(true)} /> : null}
        </SheetContent>
      </Sheet>
      {detay.data ? (
        <CorrectionDialog poz={detay.data} open={duzelt} onOpenChange={setDuzelt} />
      ) : null}
    </div>
  );
}

function PozDetail({ poz, onCorrect }: { poz: PozDetayi; onCorrect: () => void }) {
  return (
    <>
      <SheetHeader className="border-b">
        <PozBreadcrumb value={poz.tanim_on_eki} />
        <SheetTitle className="font-mono text-base">{poz.poz_numarasi}</SheetTitle>
        <SheetDescription>
          {poz.kurum_adi} · {poz.kitap_adi} · {poz.donem ?? 'dönem yok'}
        </SheetDescription>
      </SheetHeader>
      <ScrollArea className="min-h-0 flex-1 p-6">
        <Tabs defaultValue="detay">
          <TabsList className="h-auto w-full justify-start overflow-x-auto">
            <TabsTrigger value="detay">Poz detayı</TabsTrigger>
            <TabsTrigger value="fiyat">Fiyatlar</TabsTrigger>
            <TabsTrigger value="analiz">Analiz kullanımları</TabsTrigger>
            <TabsTrigger value="kaynak">Kaynak kanıtı</TabsTrigger>
          </TabsList>
          <TabsContent value="detay" className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{poz.tanim}</CardTitle>
                  <Badge variant="outline">{kayitTuruEtiketi(poz.poz_turu)}</Badge>
                </div>
                <CardDescription>
                  Kaynak birim: {poz.birim ?? '—'} · Fasikül: {poz.fasikul_adi ?? '—'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <DetailField label="Kategori" value={poz.kategori} />
                <DetailField label="Alt kategori" value={poz.alt_kategori} />
                <DetailField label="Satın alma yeri" value={poz.satin_alma_yeri} />
                <DetailField label="Eski poz numarası" value={poz.eski_poz_numarasi} mono />
              </CardContent>
            </Card>
            {poz.ek_sutunlar.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Kaynak / Standart</CardTitle>
                  <CardDescription>
                    Açıklama ile değer bloğu arasındaki kaynak sütunu ayrı korunur.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {poz.ek_sutunlar.map((sutun, index) => (
                    <Badge key={`${sutun}-${index}`} variant="secondary">
                      {sutun}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            ) : null}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tarif ve uygulama notları</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-sm leading-6">
                <DetailText label="Tarif" value={poz.tarif} />
                <DetailText label="Ölçüm kuralı" value={poz.olcum_kurali} />
                <DetailText label="Ödeme esası" value={poz.odeme_esasi} />
                <DetailText label="Notlar" value={poz.notlar} />
              </CardContent>
            </Card>
            {poz.analiz_satiri_sayisi > 0 ? (
              <Alert>
                <AlertTriangle />
                <AlertTitle>Analiz varyantı kapsamı</AlertTitle>
                <AlertDescription>
                  Bu pozda {poz.analiz_satiri_sayisi.toLocaleString('tr-TR')} analiz satırı var. D10
                  tekillik kararı tamamlanana kadar birden fazla blok tek analizmiş gibi
                  yorumlanmamalıdır.
                </AlertDescription>
              </Alert>
            ) : null}
          </TabsContent>
          <TabsContent value="fiyat">
            <div className="flex flex-col gap-3 py-3">
              {poz.fiyatlar.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
                  Fiyat kaydı yok.
                </p>
              ) : (
                poz.fiyatlar.map((fiyat, index) => (
                  <div
                    key={fiyat.id ?? `${fiyat.fiyat_turu}-${index}`}
                    className="flex items-center justify-between gap-4 rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{fiyatTuruEtiketi(fiyat.fiyat_turu)}</p>
                      <p className="text-muted-foreground text-xs">
                        Kaynak birim: {fiyat.birim_ham ?? 'kaydedilmemiş'}
                      </p>
                    </div>
                    <strong
                      className={cn(
                        'font-mono tabular-nums',
                        fiyat.tutar < 0 && 'text-destructive',
                      )}
                    >
                      {paraBicimle(fiyat.tutar, fiyat.para_birimi_kodu)}
                    </strong>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="analiz">
            <div className="py-3">
              {poz.kullanildigi_analizler.length === 0 ? (
                <Alert>
                  <Layers3 />
                  <AlertTitle>Bağlı analiz kullanımı yok</AlertTitle>
                  <AlertDescription>
                    Bileşen poz bağlantısı henüz tüm analizlerde kurulmadığı için bu boş durum,
                    pozun hiçbir analizde kullanılmadığını kesin olarak göstermez.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kullanan poz</TableHead>
                        <TableHead>Dönem</TableHead>
                        <TableHead className="text-right">Miktar</TableHead>
                        <TableHead className="text-right">Birim fiyat</TableHead>
                        <TableHead className="text-right">Toplam</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poz.kullanildigi_analizler.map((row) => (
                        <TableRow key={`${row.kullanan_poz_id}-${row.satir_no}`}>
                          <TableCell>
                            <p className="font-mono font-medium">{row.kullanan_poz_numarasi}</p>
                            <p className="text-muted-foreground max-w-sm truncate text-xs">
                              {row.kullanan_poz_tanimi}
                            </p>
                          </TableCell>
                          <TableCell>{row.donem ?? '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {sayiBicimle(row.miktar)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {sayiBicimle(row.birim_fiyat)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {sayiBicimle(row.satir_toplami)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="kaynak">
            <div className="flex flex-col gap-4 py-3">
              <div className="rounded-xl border border-dashed p-6 text-center">
                <BookOpen className="text-muted-foreground mx-auto size-8" aria-hidden="true" />
                <p className="mt-3 font-medium">PDF sayfa {poz.kaynak_sayfa}</p>
                <p className="text-muted-foreground mt-1 text-xs break-all">{poz.kaynak_url}</p>
                <p className="text-muted-foreground mt-2 font-mono text-[11px]">
                  SHA-256: {poz.kaynak_sha256 ?? '—'}
                </p>
              </div>
              <DetailField label="Kaynak tablo" value={poz.kaynak_tablo} />
              <DetailField
                label="Kaynak satır"
                value={poz.kaynak_satir == null ? null : String(poz.kaynak_satir)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
      <div className="border-t p-4">
        <Button className="w-full sm:w-auto" onClick={onCorrect}>
          <PencilLine data-icon="inline-start" /> Düzeltme taslağı oluştur
        </Button>
      </div>
    </>
  );
}

function PozBreadcrumb({ value }: { value: string | null }) {
  const parcalar = value
    ?.split('>')
    .map((parca) => parca.trim())
    .filter(Boolean);
  if (!parcalar?.length) return null;
  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap overflow-hidden text-[11px]">
        {parcalar.map((parca, index) => (
          <Fragment key={`${parca}-${index}`}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="max-w-52 truncate">{parca}</BreadcrumbPage>
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="bg-muted/60 rounded-lg p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={cn('mt-1 text-sm', mono && 'font-mono')}>{value ?? '—'}</p>
    </div>
  );
}

function DetailText({ label, value }: { label: string; value: string | null }) {
  return (
    <section>
      <h3 className="font-medium">{label}</h3>
      <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{value ?? 'Kayıt yok.'}</p>
    </section>
  );
}

function CorrectionDialog({
  poz,
  open,
  onOpenChange,
}: {
  poz: PozDetayi;
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
    [birim, poz.birim, poz.tanim, tanim],
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
            Kaynak satır değişmez. Onaylanan düzeltme etkin görünümde sürümlü olarak uygulanır.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="duzeltme-tanim">Tanım</Label>
            <Textarea
              id="duzeltme-tanim"
              rows={5}
              value={tanim}
              onChange={(event) => setTanim(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="duzeltme-birim">Birim</Label>
            <Input
              id="duzeltme-birim"
              className="h-10"
              value={birim}
              onChange={(event) => setBirim(event.target.value)}
            />
          </div>
          {fiyatlar.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Label>Birim fiyat düzeltmeleri</Label>
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                {fiyatlar.map((fiyat, index) => (
                  <div
                    key={fiyat.id ?? `${fiyat.fiyat_turu}-${index}`}
                    className="grid gap-2 sm:grid-cols-[1fr_140px_90px]"
                  >
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
          ) : null}
          <div className="flex flex-col gap-2">
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
              <History className="size-3.5" aria-hidden="true" /> Değişiklik özeti
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
            {isPending ? <Loader2 className="animate-spin" /> : <PencilLine />}
            İncelemeye gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function paraBicimle(tutar: number, paraBirimi: string) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: paraBirimi,
    }).format(tutar);
  } catch {
    return `${tutar.toLocaleString('tr-TR')} ${paraBirimi}`;
  }
}

function sayiBicimle(value: number | null) {
  return value == null ? '—' : value.toLocaleString('tr-TR', { maximumFractionDigits: 6 });
}

function kayitTuruEtiketi(tur: string) {
  return KAYIT_TURLERI.find(([value]) => value === tur)?.[1] ?? tur;
}

function fiyatTuruEtiketi(tur: string) {
  return (
    (
      {
        unit_price: 'Birim fiyat',
        alternate_unit_price: 'Alternatif birim fiyatı',
        montage_price: 'Montaj fiyatı',
        demontage_price: 'Demontaj fiyatı',
        rayic: 'Rayiç',
        karsiz: 'Kârsız fiyat',
        component_unit_price: 'Bileşen birim fiyatı',
        other: 'Diğer',
      } as Record<string, string>
    )[tur] ?? tur
  );
}
