'use client';

import { useState, useTransition } from 'react';
import {
  Building2,
  DatabaseZap,
  FileArchive,
  Globe2,
  Loader2,
  Plus,
  Settings2,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';

import { gorevOlusturAction, kaynakYayiniKaydetAction } from '@features/admin/actions';
import { createClient } from '@shared/lib/supabase/client';
import { Button } from '@shared/components/ui/button';
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
import { Progress } from '@shared/components/ui/progress';
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
  aktarimlar,
  profiller,
  hata,
}: {
  kurumlar: Row[];
  yayinlar: Row[];
  aktarimlar: Row[];
  profiller: Row[];
  hata?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
      <SectionHeader
        baslik="Kaynaklar"
        aciklama="Resmî kurum alanları, kitap aileleri, yayınlar, fasiküller, belge envanteri ve aktarım kalitesini yönetin."
        actions={<SourceDialog />}
      />
      {hata && (
        <p className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm">
          {hata}
        </p>
      )}
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric icon={Building2} label="Kurum" value={kurumlar.length} />
        <Metric icon={FileArchive} label="Yayın" value={yayinlar.length} />
        <Metric icon={DatabaseZap} label="Aktarım" value={aktarimlar.length} />
      </section>
      <Tabs defaultValue="yayinlar">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="yayinlar">Yayın kataloğu</TabsTrigger>
          <TabsTrigger value="aktarimlar">Aktarım raporları</TabsTrigger>
          <TabsTrigger value="profiller">Profil sürümleri</TabsTrigger>
          <TabsTrigger value="envanter">Belge envanteri</TabsTrigger>
        </TabsList>
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
                        <StatusBadge durum={String(row.durum ?? 'taslak')} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="aktarimlar">
          <div className="grid gap-3 lg:grid-cols-2">
            {aktarimlar.length === 0 ? (
              <Empty text="Henüz aktarım çalışması yok." />
            ) : (
              aktarimlar.map((row) => {
                const islenen = Number(row.islenen_surum_sayisi ?? 0);
                const hatali = Number(row.hatali_satir_sayisi ?? 0);
                const total = Math.max(islenen + hatali, 1);
                return (
                  <Card key={String(row.id)}>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="font-mono text-sm">
                          {String(row.id).slice(0, 12)}
                        </CardTitle>
                        <StatusBadge durum={String(row.durum ?? 'bekliyor')} />
                      </div>
                      <CardDescription>
                        {formatDate(String(row.baslama_zamani ?? row.olusturulma_zamani ?? ''))}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-xs">
                        <span>{islenen} işlenen</span>
                        <span>{hatali} hatalı</span>
                      </div>
                      <Progress className="mt-2" value={(islenen / total) * 100} />
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
        <TabsContent value="envanter">
          <InventoryLauncher />
        </TabsContent>
        <TabsContent value="profiller">
          <Profiles rows={profiller} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
function Profiles({ rows }: { rows: Row[] }) {
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
              <AccordionItem key={String(row.id)} value={String(row.id)}>
                <AccordionTrigger className="min-h-11 hover:no-underline">
                  <span className="flex min-w-0 items-center gap-3 text-left">
                    <span className="truncate font-medium">{String(row.kurum ?? 'Kurum')}</span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {String(row.belge_turu)} · v{String(row.surum)}
                    </span>
                    <StatusBadge durum={String(row.durum)} />
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="mb-3 flex flex-wrap gap-4 text-xs">
                    <span>
                      Güven:{' '}
                      {row.guven_puani == null
                        ? '—'
                        : `%${Math.round(Number(row.guven_puani) * 100)}`}
                    </span>
                    <span>{formatDate(String(row.olusturma_tarihi ?? ''))}</span>
                    {row.olusturan_gorev_id ? (
                      <span className="font-mono">Görev {String(row.olusturan_gorev_id)}</span>
                    ) : null}
                  </div>
                  <pre className="bg-muted max-h-80 overflow-auto rounded-lg p-3 font-mono text-xs">
                    {JSON.stringify(row.kurallar_json ?? {}, null, 2)}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          <p className="text-muted-foreground text-xs">{label}</p>
        </div>
      </CardContent>
    </Card>
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
function SourceDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fields = [
    ['kurumKodu', 'Kurum kodu', 'CSIDB'],
    ['kurumAdi', 'Kurum adı', 'Çevre, Şehircilik ve İklim Değişikliği Bakanlığı'],
    ['kurumUrl', 'Resmî katalog URL', 'https://...'],
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
            Tarama ajanı yalnız burada kayıtlı resmî kurum alanlarına erişebilir.
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
