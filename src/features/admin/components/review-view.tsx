'use client';

import { useMemo, useState, useTransition } from 'react';
import { Check, ClipboardCheck, Eye, Loader2, Search, ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';

import { incelemeKarariAction } from '@features/admin/actions';
import type { AdminBolumVerisi, IncelemeKaydi } from '@features/admin/types';
import { Alert, AlertDescription, AlertTitle } from '@shared/components/ui/alert';
import { Button } from '@shared/components/ui/button';
import { Card, CardContent } from '@shared/components/ui/card';
import { Checkbox } from '@shared/components/ui/checkbox';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Progress } from '@shared/components/ui/progress';
import { ScrollArea } from '@shared/components/ui/scroll-area';
import {
  Select,
  SelectContent,
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
import { Slider } from '@shared/components/ui/slider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/components/ui/table';
import { Textarea } from '@shared/components/ui/textarea';
import { InfrastructureAlert, SectionHeader, StatusBadge, formatDate } from './admin-primitives';

export function ReviewView({ kayitlar }: { kayitlar: AdminBolumVerisi<IncelemeKaydi[]> }) {
  const [secilenler, setSecilenler] = useState<string[]>([]);
  const [secili, setSecili] = useState<IncelemeKaydi | null>(null);
  const [arama, setArama] = useState('');
  const [tur, setTur] = useState('tum');
  const [esik, setEsik] = useState(0.8);
  const [orneklem, setOrneklem] = useState(false);
  const [gerekce, setGerekce] = useState('Kaynak karşılaştırması ve örneklem kontrolü tamamlandı.');
  const [isPending, startTransition] = useTransition();
  const filtreli = useMemo(
    () =>
      kayitlar.data.filter(
        (kayit) =>
          (tur === 'tum' || kayit.tur === tur) &&
          `${kayit.baslik} ${kayit.ozet ?? ''}`
            .toLocaleLowerCase('tr-TR')
            .includes(arama.toLocaleLowerCase('tr-TR')),
      ),
    [arama, kayitlar.data, tur],
  );
  const uygun = filtreli.filter((kayit) => (kayit.guven_puani ?? 0) >= esik);
  const secilebilir = new Set(uygun.map((kayit) => kayit.id));
  function tumunuSec(checked: boolean) {
    setSecilenler(checked ? uygun.map((kayit) => kayit.id) : []);
    setOrneklem(false);
  }
  function karar(kararTuru: 'onayla' | 'reddet') {
    startTransition(async () => {
      const sonuc = await incelemeKarariAction({
        idler: secilenler,
        karar: kararTuru,
        gerekce,
        orneklemOnaylandi: secilenler.length <= 1 || orneklem,
        asgariGuven: esik,
      });
      if (!sonuc.ok) {
        toast.error(sonuc.error);
        return;
      }
      toast.success(`${secilenler.length} inceleme kaydı işlendi.`);
      setSecilenler([]);
      setOrneklem(false);
    });
  }
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
      <SectionHeader
        baslik="İnceleme merkezi"
        aciklama="Kaynak, ham değer, ajan önerisi ve etkin sonucu yan yana karşılaştırın; toplu işlemleri güven eşiği ve örneklemle koruyun."
      />
      <InfrastructureAlert message={kayitlar.uyari} />
      <Card className="gap-0 py-0">
        <div className="grid gap-3 border-b p-3 lg:grid-cols-[1fr_210px_260px]">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              className="h-10 pl-9"
              placeholder="Başlık veya özet ara"
              value={arama}
              onChange={(event) => setArama(event.target.value)}
              aria-label="İncelemelerde ara"
            />
          </div>
          <Select value={tur} onValueChange={setTur}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tum">Tüm öneri türleri</SelectItem>
              {['ajan_onerisi', 'belge_profili', 'poz_duzeltmesi', 'dosya_degisikligi'].map(
                (item) => (
                  <SelectItem key={item} value={item}>
                    {item.replaceAll('_', ' ')}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <Label>Asgari güven</Label>
              <strong className="tabular-nums">%{Math.round(esik * 100)}</strong>
            </div>
            <Slider
              value={[esik]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={(value) => {
                setEsik(value[0] ?? 0.8);
                setSecilenler([]);
                setOrneklem(false);
              }}
            />
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Eşiğe uyan tüm kayıtları seç"
                    checked={uygun.length > 0 && secilenler.length === uygun.length}
                    onCheckedChange={(value) => tumunuSec(value === true)}
                  />
                </TableHead>
                <TableHead>Öneri</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>Güven</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">Karşılaştır</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtreli.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground h-32 text-center">
                    Bekleyen inceleme bulunmuyor.
                  </TableCell>
                </TableRow>
              ) : (
                filtreli.map((kayit) => (
                  <TableRow
                    key={kayit.id}
                    data-state={secilenler.includes(kayit.id) ? 'selected' : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        disabled={!secilebilir.has(kayit.id)}
                        checked={secilenler.includes(kayit.id)}
                        onCheckedChange={(value) => {
                          setSecilenler((onceki) =>
                            value === true
                              ? [...onceki, kayit.id]
                              : onceki.filter((id) => id !== kayit.id),
                          );
                          setOrneklem(false);
                        }}
                        aria-label={`${kayit.baslik} kaydını seç`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <p className="font-medium whitespace-normal">{kayit.baslik}</p>
                        <p className="text-muted-foreground line-clamp-1 whitespace-normal">
                          {kayit.ozet}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{kayit.tur.replaceAll('_', ' ')}</TableCell>
                    <TableCell>
                      <div className="flex min-w-28 items-center gap-2">
                        <Progress value={(kayit.guven_puani ?? 0) * 100} className="h-1.5" />
                        <span className="tabular-nums">
                          %{Math.round((kayit.guven_puani ?? 0) * 100)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge durum={kayit.durum} />
                    </TableCell>
                    <TableCell>{formatDate(kayit.olusturma_tarihi)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSecili(kayit)}>
                        <Eye /> Aç
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {secilenler.length > 0 && (
        <Card className="border-primary/30">
          <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_320px_auto]">
            <div>
              <p className="font-medium">{secilenler.length} kayıt seçildi</p>
              <p className="text-muted-foreground text-xs">
                Yalnız %{Math.round(esik * 100)} ve üzerindeki kayıtlar kapsamda.
              </p>
              {secilenler.length > 1 && (
                <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3">
                  <Checkbox
                    checked={orneklem}
                    onCheckedChange={(value) => setOrneklem(value === true)}
                  />
                  <span className="text-xs">
                    Rastgele örnekleri kaynakla karşılaştırdım ve toplu kararı onaylıyorum.
                  </span>
                </label>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="inceleme-gerekce">Karar gerekçesi</Label>
              <Textarea
                id="inceleme-gerekce"
                rows={3}
                value={gerekce}
                onChange={(event) => setGerekce(event.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => karar('reddet')}
                disabled={isPending || !gerekce.trim()}
              >
                <X /> Reddet
              </Button>
              <Button
                onClick={() => karar('onayla')}
                disabled={isPending || !gerekce.trim() || (secilenler.length > 1 && !orneklem)}
              >
                {isPending ? <Loader2 className="animate-spin" /> : <Check />} Onayla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Sheet open={Boolean(secili)} onOpenChange={(open) => !open && setSecili(null)}>
        <SheetContent className="w-full sm:max-w-4xl">
          {secili && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="size-4" />
                  {secili.baslik}
                </SheetTitle>
                <SheetDescription>{secili.ozet}</SheetDescription>
              </SheetHeader>
              <ScrollArea className="min-h-0 flex-1 p-6">
                <Alert>
                  <ShieldAlert className="size-4" />
                  <AlertTitle>Kaynak korunur</AlertTitle>
                  <AlertDescription>
                    Onay, ham satırı değiştirmez; sürümlü etkin veri katmanına uygulanır.
                  </AlertDescription>
                </Alert>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <CompareBlock title="Mevcut / ham değer" data={secili.mevcut_veri} />
                  <CompareBlock title="Ajan önerisi" data={secili.onerilen_veri} />
                </div>
                <CompareBlock
                  title="Uygulanan kurallar ve kanıt"
                  data={secili.kurallar}
                  className="mt-4"
                />
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CompareBlock({
  title,
  data,
  className = '',
}: {
  title: string;
  data: Record<string, unknown>;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border ${className}`}>
      <h3 className="border-b px-3 py-2 text-xs font-semibold">{title}</h3>
      <pre className="max-h-96 overflow-auto p-3 font-mono text-xs leading-5 break-words whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  );
}
