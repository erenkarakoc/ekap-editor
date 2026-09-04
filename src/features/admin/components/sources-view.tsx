'use client';

import { useState, useTransition } from 'react';
import {
  CheckCircle2,
  FileArchive,
  FileWarning,
  Globe2,
  Loader2,
  Plus,
  Settings2,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  belgeProfiliOnaylaAction,
  gorevOlusturAction,
  kaynakYayiniKaydetAction,
} from '@features/admin/actions';
import type { AdminBolumVerisi, AdminOzet, BelgeProfili } from '@features/admin/types';
import { createClient } from '@shared/lib/supabase/client';
import { Button } from '@shared/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@shared/components/ui/alert';
import { Badge } from '@shared/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@shared/components/ui/accordion';
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
  DialogTrigger,
} from '@shared/components/ui/dialog';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Switch } from '@shared/components/ui/switch';
import { Textarea } from '@shared/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { SectionHeader, StatusBadge, formatDate } from './admin-primitives';

type Row = Record<string, unknown>;

export function SourcesView({
  kurumlar,
  yayinlar,
  profiller,
  ozet,
  hata,
}: {
  kurumlar: Row[];
  yayinlar: Row[];
  profiller: BelgeProfili[];
  ozet: AdminBolumVerisi<AdminOzet>;
  hata?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
      <SectionHeader
        baslik="Kaynaklar"
        aciklama="Resmî kurum alanları, yayınlar, belge profilleri ve hedef şema durumlarını yönetin."
        actions={<SourceDialog />}
      />
      {hata && (
        <p className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm">
          {hata}
        </p>
      )}
      {ozet.uyari ? (
        <Alert>
          <FileWarning />
          <AlertTitle>Envanter sayıları alınamadı</AlertTitle>
          <AlertDescription>{ozet.uyari}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Kaynak envanteri özeti">
        <InventoryMetric label="Kurum" value={ozet.data.kurum_sayisi} />
        <InventoryMetric label="Belge" value={ozet.data.belge_sayisi} />
        <InventoryMetric label="Kaynak sayfa" value={ozet.data.sayfa_sayisi} />
        <InventoryMetric label="Belge profili" value={ozet.data.profil_sayisi} />
      </div>
      <Alert>
        <FileWarning />
        <AlertTitle>Kurum ağacında açık veri kararı</AlertTitle>
        <AlertDescription>
          “VGM 2026 Ağustos birim fiyatları” olarak kayıtlı belge ölçümde Kültür ve Turizm Bakanlığı
          belgesi çıktı. Kurum bağı düzeltilene kadar bu yayını VGM envanterinin kesin parçası
          saymayın.
        </AlertDescription>
      </Alert>
      <Tabs defaultValue="yayinlar">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="kurumlar">Kurumlar</TabsTrigger>
          <TabsTrigger value="yayinlar">Yayın kataloğu</TabsTrigger>
          <TabsTrigger value="profiller">Profil sürümleri</TabsTrigger>
          <TabsTrigger value="envanter">Belge envanteri</TabsTrigger>
        </TabsList>
        <TabsContent value="kurumlar">
          <Card className="gap-0 py-0">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kurum</TableHead>
                    <TableHead>Kod</TableHead>
                    <TableHead>Resmî apex URL</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kurumlar.map((row) => (
                    <TableRow key={String(row.id)}>
                      <TableCell className="font-medium">{String(row.ad ?? '—')}</TableCell>
                      <TableCell className="font-mono">{String(row.kod ?? '—')}</TableCell>
                      <TableCell>
                        {row.resmi_url ? (
                          <a
                            className="text-primary underline-offset-4 hover:underline"
                            href={String(row.resmi_url)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {String(row.resmi_url)}
                          </a>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge durum={String(row.durum ?? 'aktif')} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="yayinlar">
          <Card className="gap-0 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Yayın</TableHead>
                  <TableHead>Kurum</TableHead>
                  <TableHead>Kitap ailesi</TableHead>
                  <TableHead>Dönem</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yayinlar.map((row) => {
                  const kurum = row.kurumlar as Row | null;
                  const kitap = row.kitap_aileleri as Row | null;
                  return (
                    <TableRow key={String(row.id)}>
                      <TableCell className="font-medium">{String(row.baslik ?? '—')}</TableCell>
                      <TableCell>{String(kurum?.ad ?? '—')}</TableCell>
                      <TableCell>{String(kitap?.ad ?? '—')}</TableCell>
                      <TableCell>{String(row.donem_etiketi_ham ?? '—')}</TableCell>
                      <TableCell>
                        <StatusBadge durum={String(row.hak_durumu ?? 'tanımsız')} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="envanter">
          <div className="flex flex-col gap-4">
            <SchemaInventory />
            <InventoryLauncher />
          </div>
        </TabsContent>
        <TabsContent value="profiller">
          <Profiles rows={profiller} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
function InventoryMetric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString('tr-TR')}</p>
        <p className="text-muted-foreground mt-1 text-xs">{label}</p>
      </CardContent>
    </Card>
  );
}

function Profiles({ rows }: { rows: BelgeProfili[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="text-primary size-4" /> Ayrıştırma profil sürümleri
        </CardTitle>
        <CardDescription>
          Kurum ve belge türü bazında üretilen kurallar; kararlar inceleme merkezinden verilir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty text="Henüz belge profili üretilmedi." />
        ) : (
          <Accordion type="single" collapsible>
            {rows.map((row) => (
              <AccordionItem key={row.id} value={String(row.id)}>
                <AccordionTrigger className="min-h-11 hover:no-underline">
                  <span className="flex min-w-0 items-center gap-3 text-left">
                    <span className="truncate font-medium">{row.kurum}</span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {row.belge_turu} · v{row.surum}
                    </span>
                    <StatusBadge durum={row.durum} />
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <span>
                        Güven:{' '}
                        {row.guven_puani == null ? '—' : `%${Math.round(row.guven_puani * 100)}`}
                      </span>
                      <span>{formatDate(row.olusturma_tarihi)}</span>
                      {row.olusturan_gorev_id ? (
                        <span className="font-mono">Görev {row.olusturan_gorev_id}</span>
                      ) : null}
                    </div>
                    <pre className="bg-muted max-h-80 overflow-auto rounded-lg p-3 font-mono text-xs">
                      {JSON.stringify(row.kurallar_json, null, 2)}
                    </pre>
                    {row.notlar ? (
                      <p className="text-muted-foreground rounded-lg border p-3 text-sm">
                        {row.notlar}
                      </p>
                    ) : null}
                    {row.durum === 'taslak' ? <ProfileApprovalDialog profil={row} /> : null}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileApprovalDialog({ profil }: { profil: BelgeProfili }) {
  const [open, setOpen] = useState(false);
  const [kisit, setKisit] = useState(0);
  const [cozulemeyen, setCozulemeyen] = useState(0);
  const [sayimFarki, setSayimFarki] = useState(0);
  const [tutarli, setTutarli] = useState(false);
  const [uyusmazSayfa, setUyusmazSayfa] = useState(0);
  const [enPahali, setEnPahali] = useState(0);
  const [enUcuz, setEnUcuz] = useState(0);
  const [ornekNotu, setOrnekNotu] = useState('');
  const [gerekce, setGerekce] = useState('');
  const [isPending, startTransition] = useTransition();
  const kriterlerTam =
    kisit === 0 &&
    cozulemeyen === 0 &&
    sayimFarki === 0 &&
    tutarli &&
    uyusmazSayfa === 0 &&
    enPahali >= 5 &&
    enUcuz >= 5 &&
    ornekNotu.trim().length >= 10 &&
    gerekce.trim().length >= 10;

  function onayla() {
    startTransition(async () => {
      const sonuc = await belgeProfiliOnaylaAction({
        profilId: profil.id,
        kisitIhlaliSayisi: kisit,
        cozulemeyenSatirSayisi: cozulemeyen,
        aciklanamayanSayimFarki: sayimFarki,
        tutarliMi: tutarli,
        uyusmazSayfaSayisi: uyusmazSayfa,
        enPahaliOrnekSayisi: enPahali,
        enUcuzOrnekSayisi: enUcuz,
        elleOrneklemeNotu: ornekNotu,
        gerekce,
      });
      if (!sonuc.ok) {
        toast.error(sonuc.error);
        return;
      }
      toast.success('Belge profili dört kriterli kabul kaydıyla onaylandı.');
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <ShieldCheck data-icon="inline-start" /> Dört kriterle onayla
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-8">
            Profil kabulü · {profil.kurum} · {profil.belge_turu} v{profil.surum}
          </DialogTitle>
          <DialogDescription>
            Onay yalnız bütün ölçümler eşikleri geçtiğinde kaydedilir; kanıt ve gerekçe işlem
            kaydına eklenir.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <AcceptanceNumber
            id={`kisit-${profil.id}`}
            label="Kısıt ihlali"
            value={kisit}
            onChange={setKisit}
            help="Beklenen: 0"
          />
          <AcceptanceNumber
            id={`cozulemeyen-${profil.id}`}
            label="Çözülemeyen satır"
            value={cozulemeyen}
            onChange={setCozulemeyen}
            help="Beklenen: 0"
          />
          <AcceptanceNumber
            id={`sayim-${profil.id}`}
            label="Açıklanamayan sayım farkı"
            value={sayimFarki}
            onChange={setSayimFarki}
            help="Beklenen: 0"
          />
          <AcceptanceNumber
            id={`uyusmaz-${profil.id}`}
            label="Uyuşmaz sayfa"
            value={uyusmazSayfa}
            onChange={setUyusmazSayfa}
            help="Beklenen: 0"
          />
          <AcceptanceNumber
            id={`pahali-${profil.id}`}
            label="Elle kontrol edilen en pahalı kayıt"
            value={enPahali}
            onChange={setEnPahali}
            help="En az 5"
          />
          <AcceptanceNumber
            id={`ucuz-${profil.id}`}
            label="Elle kontrol edilen en ucuz kayıt"
            value={enUcuz}
            onChange={setEnUcuz}
            help="En az 5"
          />
          <div className="flex min-h-16 items-center gap-3 rounded-lg border p-3 sm:col-span-2">
            <Switch
              id={`aktarim-tutarli-${profil.id}`}
              checked={tutarli}
              onCheckedChange={setTutarli}
            />
            <Label htmlFor={`aktarim-tutarli-${profil.id}`} className="cursor-pointer font-normal">
              <span className="block text-sm font-medium">Aktarım tutarlı</span>
              <span className="text-muted-foreground block text-xs">
                <code>aktarim_tutarlilik.tutarli_mi</code> değeri true ve uyuşmaz sayfa yok.
              </span>
            </Label>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor={`ornek-notu-${profil.id}`}>Elle örnekleme notu</Label>
            <Textarea
              id={`ornek-notu-${profil.id}`}
              value={ornekNotu}
              onChange={(event) => setOrnekNotu(event.target.value)}
              rows={3}
              placeholder="Karşılaştırılan kaynak sayfaları ve sonuçları yazın."
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor={`profil-gerekce-${profil.id}`}>Onay gerekçesi</Label>
            <Textarea
              id={`profil-gerekce-${profil.id}`}
              value={gerekce}
              onChange={(event) => setGerekce(event.target.value)}
              rows={3}
              placeholder="Bu profilin üretimde kullanılmaya neden hazır olduğunu açıklayın."
            />
          </div>
          <Alert className="sm:col-span-2">
            {kriterlerTam ? <CheckCircle2 /> : <FileWarning />}
            <AlertTitle>{kriterlerTam ? 'Kabul ölçütleri tamam' : 'Kanıt bekleniyor'}</AlertTitle>
            <AlertDescription>
              Profil durumu, bu formdaki değerler sunucuda yeniden doğrulandıktan sonra değişir.
            </AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Vazgeç
          </Button>
          <Button disabled={isPending || !kriterlerTam} onClick={onayla}>
            {isPending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            Profili onayla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AcceptanceNumber({
  id,
  label,
  value,
  onChange,
  help,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  help: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <p className="text-muted-foreground text-xs">{help}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-muted-foreground col-span-full rounded-xl border border-dashed p-10 text-center text-sm">
      {text}
    </div>
  );
}
function InventoryLauncher() {
  const [path, setPath] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  function submit(kind: 'storage' | 'yerel') {
    startTransition(async () => {
      let belgeYolu = path;
      if (kind === 'storage' && file) {
        const supabase = createClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
          toast.error('Storage yüklemesi için geçerli admin oturumu bulunamadı.');
          return;
        }
        const guvenliAd = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        belgeYolu = `${authData.user.id}/admin/${Date.now()}-${guvenliAd}`;
        const { error: uploadError } = await supabase.storage
          .from('official-documents')
          .upload(belgeYolu, file, { upsert: false, contentType: file.type || undefined });
        if (uploadError) {
          toast.error(uploadError.message);
          return;
        }
        setPath(belgeYolu);
      }
      const result = await gorevOlusturAction({
        tur: 'belge_isle',
        girdi:
          kind === 'storage'
            ? { storage_kovasi: 'official-documents', storage_yolu: belgeYolu }
            : { yerel_yol: belgeYolu, kaynak: 'electron_envanter' },
        oncelik: 100,
        maksDeneme: 3,
      });
      if (result.ok) toast.success('Belge işleme görevi kuyruğa alındı.');
      else toast.error(result.error);
    });
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UploadCloud className="text-primary size-4" />
          Belgeyi işleme kuyruğuna al
        </CardTitle>
        <CardDescription>
          Storage nesne yolu web ve masaüstünde çalışır. Yerel yol yalnız aynı çalışma köküne bağlı
          Electron worker tarafından okunur.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          <Label htmlFor="inventory-path" className="sr-only">
            Belge yolu
          </Label>
          <Input
            id="inventory-path"
            className="h-11"
            value={path}
            onChange={(event) => setPath(event.target.value)}
            placeholder="storage/kurum/yayin.pdf veya belgeler/ornek.pdf"
          />
          <Input
            type="file"
            accept=".pdf,.xlsx,.xls,.csv,.json"
            aria-label="Storage için belge seç"
            className="h-11"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <Button
          variant="outline"
          className="h-11"
          onClick={() => submit('storage')}
          disabled={isPending || (!path && !file)}
        >
          <UploadCloud /> {file ? 'Yükle ve işle' : 'Storage yolu'}
        </Button>
        <Button className="h-11" onClick={() => submit('yerel')} disabled={isPending || !path}>
          {isPending ? <Loader2 className="animate-spin" /> : <FileArchive />} Yerel envanter
        </Button>
      </CardContent>
    </Card>
  );
}

const ENVANTER_ISTISNALARI = [
  [
    'TÜİK eşleştirme',
    'KB KVGM + VGM TÜİK',
    'Hedef şema yok',
    'Poz–TÜİK endeks ilişkisi için hedef tablo yok; endeks kodları fiyat değildir.',
  ],
  ['Revizyon cetveli', 'KB ekleme-değişiklik', 'Hedef şema yok', 'Revizyon günlüğü şeması yok.'],
  ['Tarif gövdesi', 'UAB', 'Hedef şema yok', 'Uzun tarif gövdesinin hedef modeli bekleniyor.'],
  ['Taranmış belge', 'UAB 2026-07', 'Aktarılmadı', 'Kaynak sayfalar için OCR gerekiyor.'],
] as const;

function SchemaInventory() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hedef şema bekleyen belgeler</CardTitle>
        <CardDescription>
          “Aktarılmadı” teknik hazırlığı, “hedef şema yok” ise bilinçli veri modelleme kararını
          gösterir. Analiz belgeleri artık bu listede değildir.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tür</TableHead>
              <TableHead>Belgeler</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Gerekçe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ENVANTER_ISTISNALARI.map(([tur, belge, durum, neden]) => (
              <TableRow key={tur}>
                <TableCell>
                  <Badge variant="outline">{tur}</Badge>
                </TableCell>
                <TableCell>{belge}</TableCell>
                <TableCell>
                  <Badge variant={durum === 'Aktarılmadı' ? 'secondary' : 'outline'}>{durum}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{neden}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell>
                <Badge variant="secondary">MSB</Badge>
              </TableCell>
              <TableCell>Tek kaynak belge</TableCell>
              <TableCell>
                <Badge variant="secondary">Kapsam bilgisi</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                Belge yok değil; yalnızca analiz belgesi var.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
function SourceDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fields = [
    ['kurumKodu', 'Kurum kodu', 'CSIDB'],
    ['kurumAdi', 'Kurum adı', 'Çevre, Şehircilik ve İklim Değişikliği Bakanlığı'],
    ['kurumUrl', 'Resmî apex URL', 'https://csb.gov.tr/'],
    ['kitapKodu', 'Kitap kodu', 'birim-fiyat'],
    ['kitapAdi', 'Kitap ailesi', 'Birim Fiyat Kitabı'],
    ['yayinBasligi', 'Yayın başlığı', '2026 Birim Fiyatları'],
    ['donemEtiketi', 'Dönem', '2026'],
    ['dogrudanBelgeUrl', 'Belge URL (isteğe bağlı)', 'https://...'],
  ] as const;
  function submit(formData: FormData) {
    startTransition(async () => {
      const value = Object.fromEntries(formData);
      const sonuc = await kaynakYayiniKaydetAction({ ...value, yayinTuru: 'unit_price_book' });
      if (sonuc.ok) {
        toast.success('Kaynak ve yayın kaydedildi.');
        setOpen(false);
      } else toast.error(sonuc.error);
    });
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Kaynak ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resmî kaynak ve yayın ekle</DialogTitle>
          <DialogDescription>
            Worker alt alan adlarını kapsamak için apex alan adını kullanır. “www.” eklemeyin; bu
            adres gezinti için değil, hostname allowlist’i içindir.
          </DialogDescription>
        </DialogHeader>
        <form action={submit}>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            {fields.map(([name, label, placeholder]) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={name}>{label}</Label>
                <Input
                  id={name}
                  name={name}
                  required={!['dogrudanBelgeUrl'].includes(name)}
                  className="h-10"
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : <Globe2 />} Kaydet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
