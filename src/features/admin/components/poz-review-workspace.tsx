'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  RiAddLine,
  RiAlertLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiFileList3Line,
  RiLoader4Line,
  RiSaveLine,
} from '@remixicon/react';
import { toast } from 'sonner';

import { pozIncelemeTaslagiKaydetAction } from '@features/admin/actions';
import type { PozFiyati, PozIncelemeDetayi, PozIncelemeKomsulari } from '@features/admin/types';
import { Alert, AlertDescription, AlertTitle } from '@shared/components/ui/alert';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/components/ui/card';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@shared/components/ui/resizable';
import { ScrollArea } from '@shared/components/ui/scroll-area';
import { Skeleton } from '@shared/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Textarea } from '@shared/components/ui/textarea';
import { cn } from '@shared/lib/utils';
import { PozPdfViewer } from './poz-pdf-viewer';

const KAYIT_TURLERI = [
  ['unit_price', 'Birim fiyat'],
  ['rayic', 'Rayiç'],
  ['karsiz', 'Kârsız'],
  ['bolum_basligi', 'Bölüm başlığı'],
  ['analysis_header', 'Analiz başlığı'],
  ['other', 'Diğer'],
] as const;
const FIYAT_TURLERI = [
  ['unit_price', 'Birim fiyat'],
  ['alternate_unit_price', 'Alternatif birim fiyatı'],
  ['montage_price', 'Montaj'],
  ['demontage_price', 'Demontaj'],
  ['rayic', 'Rayiç'],
  ['karsiz', 'Kârsız'],
  ['component_unit_price', 'Bileşen birim fiyatı'],
  ['other', 'Diğer'],
] as const;
const FIYAT_TUTARI_RE = /^-?\d+(?:\.\d{1,4})?$/;

interface FormFiyati {
  fiyat_turu: string;
  tutar: string;
  tutar_ham?: string;
  para_birimi_kodu: string;
  birim_ham: string;
}
type KaydedilecekFiyat = Omit<FormFiyati, 'birim_ham'> & { birim_ham: string | null };
interface FormDegerleri {
  eski_poz_numarasi: string;
  tanim: string;
  tanim_on_eki: string;
  tanim_son_eki: string;
  birim: string;
  birim_kodu: string;
  poz_turu: string;
  kategori: string;
  alt_kategori: string;
  satin_alma_yeri: string;
  notlar: string;
  tarif: string;
  olcum_kurali: string;
  odeme_esasi: string;
  dahil_olan_masraflar: string;
  dahil_olmayan_masraflar: string;
  fiyatlar: FormFiyati[];
  gerekce: string;
}

export function PozReviewWorkspace({
  detay,
  komsular,
  komsuUyarisi,
  birimler,
  queryString,
}: {
  detay: PozIncelemeDetayi;
  komsular: PozIncelemeKomsulari;
  komsuUyarisi?: string;
  birimler: Array<{ kod: string; ad: string }>;
  queryString: string;
}) {
  const router = useRouter();
  const [masaustu, setMasaustu] = useState<boolean | null>(null);
  const [form, setForm] = useState<FormDegerleri>(() => formaCevir(detay));
  const [taslakYuklendi, setTaslakYuklendi] = useState(false);
  const [isPending, startTransition] = useTransition();
  const saklamaAnahtari = `poz-inceleme:${detay.poz.poz_surumu_id}:${detay.temel_hash}`;
  const ilkForm = useMemo(() => formaCevir(detay), [detay]);
  const degisiklik = useMemo(() => degisiklikleriBul(form, ilkForm), [form, ilkForm]);
  const degisti = Object.keys(degisiklik.alanlar).length > 0 || degisiklik.fiyatlar !== null;
  const formGecerli =
    form.tanim.trim().length >= 2 &&
    form.fiyatlar.every(
      (fiyat) =>
        FIYAT_TUTARI_RE.test(fiyat.tutar.trim()) &&
        /^[A-Z]{3}$/.test(fiyat.para_birimi_kodu.trim()),
    );

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const guncelle = () => setMasaustu(media.matches);
    guncelle();
    media.addEventListener('change', guncelle);
    return () => media.removeEventListener('change', guncelle);
  }, []);

  useEffect(() => {
    try {
      const kayitli = sessionStorage.getItem(saklamaAnahtari);
      if (kayitli) setForm(JSON.parse(kayitli) as FormDegerleri);
    } catch {
      sessionStorage.removeItem(saklamaAnahtari);
    } finally {
      setTaslakYuklendi(true);
    }
  }, [saklamaAnahtari]);

  useEffect(() => {
    if (!taslakYuklendi) return;
    sessionStorage.setItem(saklamaAnahtari, JSON.stringify(form));
  }, [form, saklamaAnahtari, taslakYuklendi]);

  useEffect(() => {
    const uyari = (event: BeforeUnloadEvent) => {
      if (!degisti) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', uyari);
    return () => window.removeEventListener('beforeunload', uyari);
  }, [degisti]);

  useEffect(() => {
    for (const id of [komsular.onceki_poz_surumu_id, komsular.sonraki_poz_surumu_id]) {
      if (id) router.prefetch(hedefUrl(id));
    }
    // Komşular veya filtre bağlamı değiştiğinde sıradaki sunucu görünümünü erkenden hazırla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [komsular.onceki_poz_surumu_id, komsular.sonraki_poz_surumu_id, queryString, router]);

  function hedefUrl(id: string) {
    return `/admin/pozlar/${id}/incele${queryString ? `?${queryString}` : ''}`;
  }
  function git(id: string | null, fallbackListe = false) {
    if (degisti && !window.confirm('Kaydedilmemiş değişiklikler silinecek. Devam edilsin mi?'))
      return;
    sessionStorage.removeItem(saklamaAnahtari);
    if (id) router.push(hedefUrl(id));
    else if (fallbackListe) router.push(`/admin/pozlar${queryString ? `?${queryString}` : ''}`);
  }
  function alan<K extends keyof FormDegerleri>(ad: K, deger: FormDegerleri[K]) {
    setForm((onceki) => ({ ...onceki, [ad]: deger }));
  }
  function gonder(sonrakineGec: boolean) {
    startTransition(async () => {
      const sonuc = await pozIncelemeTaslagiKaydetAction({
        pozSurumuId: detay.poz.poz_surumu_id,
        temelHash: detay.temel_hash,
        degisiklikler: degisiklik.alanlar,
        fiyatlar: degisiklik.fiyatlar,
        gerekce: form.gerekce,
      });
      if (!sonuc.ok) {
        toast.error('Düzeltme taslağı kaydedilemedi', { description: sonuc.error });
        return;
      }
      sessionStorage.removeItem(saklamaAnahtari);
      toast.success('Düzeltme inceleme kuyruğuna gönderildi.');
      if (sonrakineGec && komsular.sonraki_poz_surumu_id) {
        router.push(hedefUrl(komsular.sonraki_poz_surumu_id));
      } else {
        router.refresh();
      }
    });
  }

  const pdf = (
    <PozPdfViewer
      url={`/admin/pozlar/${detay.poz.poz_surumu_id}/kaynak`}
      belgeAnahtari={detay.belge.sha256 ?? detay.belge.id}
      kaynakSayfa={detay.belge.kaynak_sayfa}
      kaynakUrl={`/admin/pozlar/${detay.poz.poz_surumu_id}/kaynak`}
      pozNumarasi={detay.poz.poz_numarasi}
    />
  );
  const editor = (
    <EditorPanel
      detay={detay}
      form={form}
      alan={alan}
      birimler={birimler}
      degisenAlanlar={new Set(Object.keys(degisiklik.alanlar))}
      fiyatlarDegisti={degisiklik.fiyatlar !== null}
      degisti={degisti}
      formGecerli={formGecerli}
      isPending={isPending}
      onSubmit={gonder}
    />
  );

  return (
    <main className="flex min-h-0 w-full flex-col gap-4 p-3 sm:p-5">
      <header className="bg-background sticky top-0 flex flex-col gap-3 rounded-xl border p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {detay.poz.poz_numarasi}
            </Badge>
            <Badge variant="secondary">Sayfa {detay.poz.kaynak_sayfa}</Badge>
            {komsular.toplam > 0 ? (
              <span className="text-muted-foreground text-xs tabular-nums">
                {komsular.sira.toLocaleString('tr-TR')} / {komsular.toplam.toLocaleString('tr-TR')}
              </span>
            ) : null}
          </div>
          <h1 className="mt-1 truncate text-base font-semibold">{detay.poz.tanim}</h1>
          <p className="text-muted-foreground truncate text-xs">
            {detay.poz.kurum_adi} · {detay.poz.kitap_adi} · {detay.poz.donem ?? 'Dönem yok'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => git(komsular.onceki_poz_surumu_id)}
            disabled={!komsular.onceki_poz_surumu_id}
          >
            <RiArrowLeftLine data-icon="inline-start" /> Önceki
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => git(komsular.sonraki_poz_surumu_id, true)}
          >
            {komsular.sonraki_poz_surumu_id ? 'Sonraki' : 'Listeye dön'}{' '}
            <RiArrowRightLine data-icon="inline-end" />
          </Button>
        </div>
      </header>
      {komsuUyarisi ? (
        <Alert>
          <RiAlertLine />
          <AlertTitle>İnceleme sırası sınırlı</AlertTitle>
          <AlertDescription>{komsuUyarisi}</AlertDescription>
        </Alert>
      ) : null}
      {detay.bekleyen_duzeltme ? (
        <Alert>
          <RiFileList3Line />
          <AlertTitle>Bu poz için bekleyen düzeltme var</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Sürüm {detay.bekleyen_duzeltme.surum_no} onaylanmadan yeni taslak oluşturulamaz.
            </span>
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/inceleme')}>
              İncelemeyi aç
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {masaustu === null ? (
        <Skeleton className="min-h-[560px] rounded-xl" aria-label="İnceleme alanı yükleniyor" />
      ) : masaustu ? (
        <ResizablePanelGroup orientation="horizontal" className="min-h-[560px]">
          <ResizablePanel defaultSize={52} minSize={35}>
            {pdf}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={48} minSize={35}>
            {editor}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <Tabs defaultValue="duzenle" className="min-w-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pdf">PDF</TabsTrigger>
            <TabsTrigger value="duzenle">Düzenle</TabsTrigger>
            <TabsTrigger value="ozet">Özet</TabsTrigger>
          </TabsList>
          <TabsContent value="pdf">{pdf}</TabsContent>
          <TabsContent value="duzenle">{editor}</TabsContent>
          <TabsContent value="ozet">
            <ChangeSummary alanlar={degisiklik.alanlar} fiyatlar={degisiklik.fiyatlar} />
          </TabsContent>
        </Tabs>
      )}
      <footer className="bg-background sticky bottom-0 flex flex-col gap-2 rounded-xl border p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            {degisti
              ? `${Object.keys(degisiklik.alanlar).length + (degisiklik.fiyatlar ? 1 : 0)} değişiklik hazır`
              : 'Etkin kayıtla aynı'}
          </p>
          <p className="text-muted-foreground text-xs">
            Ham kaynak değişmez; taslak ayrı onaydan sonra etkinleşir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => git(komsular.sonraki_poz_surumu_id, true)}
            disabled={isPending || degisti}
          >
            <RiCheckLine data-icon="inline-start" /> Değişiklik yok,{' '}
            {komsular.sonraki_poz_surumu_id ? 'sonraki' : 'listeye dön'}
          </Button>
          <Button
            variant="outline"
            onClick={() => gonder(false)}
            disabled={
              !degisti ||
              !formGecerli ||
              form.gerekce.trim().length < 10 ||
              isPending ||
              Boolean(detay.bekleyen_duzeltme)
            }
          >
            {isPending ? (
              <RiLoader4Line className="animate-spin" data-icon="inline-start" />
            ) : (
              <RiSaveLine data-icon="inline-start" />
            )}{' '}
            İncelemeye gönder
          </Button>
          <Button
            onClick={() => gonder(true)}
            disabled={
              !degisti ||
              !formGecerli ||
              form.gerekce.trim().length < 10 ||
              isPending ||
              !komsular.sonraki_poz_surumu_id ||
              Boolean(detay.bekleyen_duzeltme)
            }
          >
            <RiArrowRightLine data-icon="inline-end" /> Gönder ve sonraki
          </Button>
        </div>
      </footer>
    </main>
  );
}

function EditorPanel({
  detay,
  form,
  alan,
  birimler,
  degisenAlanlar,
  fiyatlarDegisti,
  degisti,
  formGecerli,
  isPending,
  onSubmit,
}: {
  detay: PozIncelemeDetayi;
  form: FormDegerleri;
  alan: <K extends keyof FormDegerleri>(ad: K, deger: FormDegerleri[K]) => void;
  birimler: Array<{ kod: string; ad: string }>;
  degisenAlanlar: Set<string>;
  fiyatlarDegisti: boolean;
  degisti: boolean;
  formGecerli: boolean;
  isPending: boolean;
  onSubmit: (sonrakineGec: boolean) => void;
}) {
  const ham = detay.ham;
  return (
    <section className="bg-background flex min-h-[560px] flex-col overflow-hidden rounded-xl border lg:h-[calc(100dvh-12rem)]">
      <Tabs defaultValue="genel" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b p-2">
          <TabsList className="h-auto w-full justify-start overflow-x-auto">
            <TabsTrigger value="genel">Genel</TabsTrigger>
            <TabsTrigger value="metin">Tarif ve notlar</TabsTrigger>
            <TabsTrigger value="kaynak">Kaynak</TabsTrigger>
          </TabsList>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">
            <TabsContent value="genel" className="flex flex-col gap-4">
              <section
                aria-labelledby="fiyatlar-basligi"
                className="bg-muted/20 flex flex-col gap-3 rounded-lg border p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 id="fiyatlar-basligi" className="text-sm font-semibold">
                        Fiyatlar
                      </h3>
                      {fiyatlarDegisti ? <Badge variant="secondary">Değişti</Badge> : null}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Pozun kaynak fiyatlarını PDF ile karşılaştırın ve gerektiğinde düzeltin.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={form.fiyatlar.length >= 20}
                    onClick={() =>
                      alan('fiyatlar', [
                        ...form.fiyatlar,
                        {
                          fiyat_turu: 'unit_price',
                          tutar: '',
                          para_birimi_kodu: 'TRY',
                          birim_ham: form.birim,
                        },
                      ])
                    }
                  >
                    <RiAddLine data-icon="inline-start" /> Fiyat ekle
                  </Button>
                </div>
                {form.fiyatlar.map((fiyat, index) => (
                  <Card key={index} className={cn(fiyatlarDegisti && 'border-primary/40')}>
                    <CardHeader className="flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">{index + 1}. fiyat</CardTitle>
                        <CardDescription>
                          Kaynak: {fiyatKaynakEtiketi(ham.fiyatlar[index])}
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${index + 1}. fiyatı sil`}
                        onClick={() =>
                          alan(
                            'fiyatlar',
                            form.fiyatlar.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <RiDeleteBinLine />
                      </Button>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                      <Select
                        value={fiyat.fiyat_turu}
                        onValueChange={(v) =>
                          alan(
                            'fiyatlar',
                            form.fiyatlar.map((r, i) =>
                              i === index ? { ...r, fiyat_turu: v } : r,
                            ),
                          )
                        }
                      >
                        <SelectTrigger aria-label={`${index + 1}. fiyat türü`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {FIYAT_TURLERI.map(([v, l]) => (
                              <SelectItem key={v} value={v}>
                                {l}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <Input
                        aria-label={`${index + 1}. fiyat tutarı`}
                        aria-invalid={!FIYAT_TUTARI_RE.test(fiyat.tutar.trim())}
                        inputMode="decimal"
                        value={fiyat.tutar}
                        onChange={(e) =>
                          alan(
                            'fiyatlar',
                            form.fiyatlar.map((r, i) =>
                              i === index ? { ...r, tutar: e.target.value.replace(',', '.') } : r,
                            ),
                          )
                        }
                      />
                      <Input
                        aria-label={`${index + 1}. para birimi`}
                        aria-invalid={!/^[A-Z]{3}$/.test(fiyat.para_birimi_kodu.trim())}
                        value={fiyat.para_birimi_kodu}
                        maxLength={3}
                        onChange={(e) =>
                          alan(
                            'fiyatlar',
                            form.fiyatlar.map((r, i) =>
                              i === index
                                ? { ...r, para_birimi_kodu: e.target.value.toUpperCase() }
                                : r,
                            ),
                          )
                        }
                      />
                      <Input
                        aria-label={`${index + 1}. kaynak birimi`}
                        value={fiyat.birim_ham}
                        onChange={(e) =>
                          alan(
                            'fiyatlar',
                            form.fiyatlar.map((r, i) =>
                              i === index ? { ...r, birim_ham: e.target.value } : r,
                            ),
                          )
                        }
                      />
                      {!FIYAT_TUTARI_RE.test(fiyat.tutar.trim()) ||
                      !/^[A-Z]{3}$/.test(fiyat.para_birimi_kodu.trim()) ? (
                        <p className="text-destructive text-xs sm:col-span-2">
                          Tutar nokta ayracıyla en fazla dört ondalık, para birimi üç büyük harf
                          olmalıdır.
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </section>
              <CompareTextarea
                id="tanim"
                label="Tanım"
                kaynak={ham.tanim}
                value={form.tanim}
                changed={degisenAlanlar.has('tanim')}
                onChange={(v) => alan('tanim', v)}
                rows={4}
              />
              <CompareTextarea
                id="tanim-on-eki"
                label="Başlık bağlamı"
                kaynak={ham.tanim_on_eki}
                value={form.tanim_on_eki}
                changed={degisenAlanlar.has('tanim_on_eki')}
                onChange={(v) => alan('tanim_on_eki', v)}
                rows={3}
              />
              <CompareTextarea
                id="tanim-son-eki"
                label="Tanım son eki"
                kaynak={ham.tanim_son_eki}
                value={form.tanim_son_eki}
                changed={degisenAlanlar.has('tanim_son_eki')}
                onChange={(v) => alan('tanim_son_eki', v)}
                rows={2}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <CompareInput
                  id="eski-poz"
                  label="Eski poz numarası"
                  kaynak={ham.eski_poz_numarasi}
                  value={form.eski_poz_numarasi}
                  changed={degisenAlanlar.has('eski_poz_numarasi')}
                  onChange={(v) => alan('eski_poz_numarasi', v)}
                  mono
                />
                <CompareInput
                  id="birim"
                  label="Kaynak birim yazımı"
                  kaynak={ham.birim}
                  value={form.birim}
                  changed={degisenAlanlar.has('birim')}
                  onChange={(v) => alan('birim', v)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <CompareSelect
                  id="birim-kodu"
                  label="Kanonik birim"
                  kaynak={ham.birim_kodu}
                  value={form.birim_kodu || '__null__'}
                  changed={degisenAlanlar.has('birim_kodu')}
                  onChange={(v) => alan('birim_kodu', v === '__null__' ? '' : v)}
                  options={[
                    ['__null__', 'Eşlenmedi'],
                    ...birimler.map((b) => [b.kod, `${b.ad} · ${b.kod}`] as [string, string]),
                  ]}
                />
                <CompareSelect
                  id="poz-turu"
                  label="Kayıt türü"
                  kaynak={ham.poz_turu}
                  value={form.poz_turu}
                  changed={degisenAlanlar.has('poz_turu')}
                  onChange={(v) => alan('poz_turu', v)}
                  options={[...KAYIT_TURLERI]}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <CompareInput
                  id="kategori"
                  label="Kategori"
                  kaynak={ham.kategori}
                  value={form.kategori}
                  changed={degisenAlanlar.has('kategori')}
                  onChange={(v) => alan('kategori', v)}
                />
                <CompareInput
                  id="alt-kategori"
                  label="Alt kategori"
                  kaynak={ham.alt_kategori}
                  value={form.alt_kategori}
                  changed={degisenAlanlar.has('alt_kategori')}
                  onChange={(v) => alan('alt_kategori', v)}
                />
              </div>
              <CompareInput
                id="satin-alma-yeri"
                label="Satın alma yeri"
                kaynak={ham.satin_alma_yeri}
                value={form.satin_alma_yeri}
                changed={degisenAlanlar.has('satin_alma_yeri')}
                onChange={(v) => alan('satin_alma_yeri', v)}
              />
            </TabsContent>
            <TabsContent value="metin" className="flex flex-col gap-4">
              <CompareTextarea
                id="tarif"
                label="Tarif"
                kaynak={ham.tarif}
                value={form.tarif}
                changed={degisenAlanlar.has('tarif')}
                onChange={(v) => alan('tarif', v)}
                rows={8}
              />
              <CompareTextarea
                id="olcum"
                label="Ölçüm kuralı"
                kaynak={ham.olcum_kurali}
                value={form.olcum_kurali}
                changed={degisenAlanlar.has('olcum_kurali')}
                onChange={(v) => alan('olcum_kurali', v)}
                rows={5}
              />
              <CompareTextarea
                id="odeme"
                label="Ödeme esası"
                kaynak={ham.odeme_esasi}
                value={form.odeme_esasi}
                changed={degisenAlanlar.has('odeme_esasi')}
                onChange={(v) => alan('odeme_esasi', v)}
                rows={5}
              />
              <CompareTextarea
                id="notlar"
                label="Notlar"
                kaynak={ham.notlar}
                value={form.notlar}
                changed={degisenAlanlar.has('notlar')}
                onChange={(v) => alan('notlar', v)}
                rows={5}
              />
              <CompareTextarea
                id="dahil"
                label="Dahil olan masraflar"
                kaynak={ham.dahil_olan_masraflar.join('\n')}
                value={form.dahil_olan_masraflar}
                changed={degisenAlanlar.has('dahil_olan_masraflar')}
                onChange={(v) => alan('dahil_olan_masraflar', v)}
                rows={5}
                helper="Her satıra bir masraf yazın."
              />
              <CompareTextarea
                id="haric"
                label="Dahil olmayan masraflar"
                kaynak={ham.dahil_olmayan_masraflar.join('\n')}
                value={form.dahil_olmayan_masraflar}
                changed={degisenAlanlar.has('dahil_olmayan_masraflar')}
                onChange={(v) => alan('dahil_olmayan_masraflar', v)}
                rows={5}
                helper="Her satıra bir masraf yazın."
              />
            </TabsContent>
            <TabsContent value="kaynak" className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Değiştirilemeyen kaynak kimliği</CardTitle>
                  <CardDescription>Bu alanlar ham veri soykütüğünü korur.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <ReadOnly label="Poz kodu" value={detay.poz.poz_numarasi} mono />
                  <ReadOnly label="Kaynak sayfa" value={String(detay.poz.kaynak_sayfa)} />
                  <ReadOnly
                    label="Kaynak tablo / satır"
                    value={`${detay.poz.kaynak_tablo ?? '—'} / ${detay.poz.kaynak_satir ?? '—'}`}
                  />
                  <ReadOnly label="SHA-256" value={detay.poz.kaynak_sha256 ?? '—'} mono />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
      <div className="border-t p-4">
        <Label htmlFor="inceleme-gerekce">Düzeltme gerekçesi</Label>
        <Textarea
          id="inceleme-gerekce"
          className="mt-2"
          rows={3}
          value={form.gerekce}
          onChange={(e) => alan('gerekce', e.target.value)}
          placeholder="Kaynak sayfada görülen değer ile yapılan düzeltmeyi açıklayın."
          aria-describedby="gerekce-yardim"
        />
        <p id="gerekce-yardim" className="text-muted-foreground mt-1 text-xs">
          İncelemeye göndermek için en az 10 karakter gerekir.
        </p>
        <Button
          className="mt-3 w-full"
          onClick={() => onSubmit(false)}
          disabled={
            !degisti ||
            !formGecerli ||
            isPending ||
            form.gerekce.trim().length < 10 ||
            Boolean(detay.bekleyen_duzeltme)
          }
        >
          <RiSaveLine data-icon="inline-start" /> Taslağı incelemeye gönder
        </Button>
      </div>
    </section>
  );
}

function CompareInput({
  id,
  label,
  kaynak,
  value,
  changed,
  onChange,
  mono = false,
}: {
  id: string;
  label: string;
  kaynak: string | null;
  value: string;
  changed: boolean;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {changed ? <Badge variant="secondary">Değişti</Badge> : null}
      </div>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(mono && 'font-mono')}
      />
      <SourceValue value={kaynak} />
    </div>
  );
}
function CompareTextarea({
  id,
  label,
  kaynak,
  value,
  changed,
  onChange,
  rows,
  helper,
}: {
  id: string;
  label: string;
  kaynak: string | null;
  value: string;
  changed: boolean;
  onChange: (v: string) => void;
  rows: number;
  helper?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {changed ? <Badge variant="secondary">Değişti</Badge> : null}
      </div>
      <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} />
      {helper ? <p className="text-muted-foreground text-xs">{helper}</p> : null}
      <SourceValue value={kaynak} />
    </div>
  );
}
function CompareSelect({
  id,
  label,
  kaynak,
  value,
  changed,
  onChange,
  options,
}: {
  id: string;
  label: string;
  kaynak: string | null;
  value: string;
  changed: boolean;
  onChange: (v: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {changed ? <Badge variant="secondary">Değişti</Badge> : null}
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <SourceValue value={kaynak} />
    </div>
  );
}
function SourceValue({ value }: { value: string | null }) {
  return (
    <p className="text-muted-foreground bg-muted/60 rounded-md px-2 py-1.5 text-xs">
      <span className="font-medium">Ham kaynak:</span> {value?.trim() || '—'}
    </p>
  );
}
function ReadOnly({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-muted/60 rounded-lg p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={cn('mt-1 text-sm [overflow-wrap:anywhere]', mono && 'font-mono')}>{value}</p>
    </div>
  );
}
function ChangeSummary({
  alanlar,
  fiyatlar,
}: {
  alanlar: Record<string, unknown>;
  fiyatlar: KaydedilecekFiyat[] | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Değişiklik özeti</CardTitle>
        <CardDescription>İnceleme kuyruğuna gönderilecek etkin veri yaması.</CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="bg-muted max-h-[65dvh] overflow-auto rounded-lg p-3 font-mono text-xs whitespace-pre-wrap">
          {JSON.stringify({ alanlar, ...(fiyatlar !== null ? { fiyatlar } : {}) }, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

function formaCevir(detay: PozIncelemeDetayi): FormDegerleri {
  const p = detay.poz;
  return {
    eski_poz_numarasi: p.eski_poz_numarasi ?? '',
    tanim: p.tanim,
    tanim_on_eki: p.tanim_on_eki ?? '',
    tanim_son_eki: p.tanim_son_eki ?? '',
    birim: p.birim ?? '',
    birim_kodu: detay.etkin_birim_kodu ?? '',
    poz_turu: p.poz_turu,
    kategori: p.kategori ?? '',
    alt_kategori: p.alt_kategori ?? '',
    satin_alma_yeri: p.satin_alma_yeri ?? '',
    notlar: p.notlar ?? '',
    tarif: p.tarif ?? '',
    olcum_kurali: p.olcum_kurali ?? '',
    odeme_esasi: p.odeme_esasi ?? '',
    dahil_olan_masraflar: (p.dahil_olan_masraflar ?? []).join('\n'),
    dahil_olmayan_masraflar: (p.dahil_olmayan_masraflar ?? []).join('\n'),
    fiyatlar: (p.fiyatlar ?? []).map(fiyatFormaCevir),
    gerekce: '',
  };
}
function fiyatFormaCevir(f: PozFiyati): FormFiyati {
  return {
    fiyat_turu: f.fiyat_turu,
    tutar: String(f.tutar),
    para_birimi_kodu: f.para_birimi_kodu,
    birim_ham: f.birim_ham ?? '',
  };
}
function satirlar(v: string) {
  return v
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}
function nullable(v: string) {
  const t = v.trim();
  return t ? t : null;
}
function degisiklikleriBul(
  form: FormDegerleri,
  ilk: FormDegerleri,
): { alanlar: Record<string, unknown>; fiyatlar: KaydedilecekFiyat[] | null } {
  const alanlar: Record<string, unknown> = {};
  const metinler: Array<
    keyof Omit<
      FormDegerleri,
      'fiyatlar' | 'gerekce' | 'dahil_olan_masraflar' | 'dahil_olmayan_masraflar'
    >
  > = [
    'eski_poz_numarasi',
    'tanim',
    'tanim_on_eki',
    'tanim_son_eki',
    'birim',
    'birim_kodu',
    'poz_turu',
    'kategori',
    'alt_kategori',
    'satin_alma_yeri',
    'notlar',
    'tarif',
    'olcum_kurali',
    'odeme_esasi',
  ];
  for (const ad of metinler) {
    if (form[ad] !== ilk[ad])
      alanlar[ad] = ad === 'tanim' || ad === 'poz_turu' ? form[ad].trim() : nullable(form[ad]);
  }
  for (const ad of ['dahil_olan_masraflar', 'dahil_olmayan_masraflar'] as const) {
    const yeni = satirlar(form[ad]);
    const eski = satirlar(ilk[ad]);
    if (JSON.stringify(yeni) !== JSON.stringify(eski)) alanlar[ad] = yeni;
  }
  const temizFiyatlar = form.fiyatlar.map((f) => ({
    ...f,
    tutar: f.tutar.trim(),
    para_birimi_kodu: f.para_birimi_kodu.trim().toUpperCase(),
    birim_ham: nullable(f.birim_ham),
  }));
  const eskiFiyatlar = ilk.fiyatlar.map((f) => ({
    ...f,
    tutar: f.tutar.trim(),
    para_birimi_kodu: f.para_birimi_kodu.trim().toUpperCase(),
    birim_ham: nullable(f.birim_ham),
  }));
  return {
    alanlar,
    fiyatlar: JSON.stringify(temizFiyatlar) === JSON.stringify(eskiFiyatlar) ? null : temizFiyatlar,
  };
}
function fiyatKaynakEtiketi(fiyat?: PozFiyati) {
  return fiyat
    ? `${fiyat.tutar.toLocaleString('tr-TR')} ${fiyat.para_birimi_kodu} / ${fiyat.birim_ham ?? '—'}`
    : 'Yeni fiyat';
}
