'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  Archive,
  Building2,
  Check,
  Copy,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  Save,
  Shield,
  UserCog,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  bankaHesabiKaydetAction,
  kullaniciOverrideKaydetAction,
  odemeKarariAction,
  paketKaydetAction,
  yetkiCozAction,
} from '@features/admin/actions';
import type {
  AdminBolumVerisi,
  PaketYetkisi,
  TicaretVerisi,
  YonetimPaketi,
} from '@features/admin/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@shared/components/ui/accordion';
import { Badge } from '@shared/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components/ui/select';
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
import { InfrastructureAlert, SectionHeader, StatusBadge, formatDate } from './admin-primitives';

const VARSAYILAN_YETKILER: PaketYetkisi[] = [
  {
    ozellik_kodu: 'poz.arama',
    ad: 'Poz arama',
    kategori: 'Poz verisi',
    deger_turu: 'boolean',
    etkin: true,
    limit_degeri: null,
    limit_periyodu: null,
  },
  {
    ozellik_kodu: 'poz.detay',
    ad: 'Poz detay ve analiz',
    kategori: 'Poz verisi',
    deger_turu: 'boolean',
    etkin: false,
    limit_degeri: null,
    limit_periyodu: null,
  },
  {
    ozellik_kodu: 'export.xlsx',
    ad: 'Excel dışa aktarma',
    kategori: 'Dışa aktarma',
    deger_turu: 'integer',
    etkin: false,
    limit_degeri: 10,
    limit_periyodu: 'aylik',
  },
  {
    ozellik_kodu: 'ai.eslestirme',
    ad: 'Otomatik eşleştirme',
    kategori: 'Yapay zekâ',
    deger_turu: 'integer',
    etkin: false,
    limit_degeri: 100,
    limit_periyodu: 'aylik',
  },
  {
    ozellik_kodu: 'workspace.proje',
    ad: 'Kayıtlı proje',
    kategori: 'Çalışma alanı',
    deger_turu: 'integer',
    etkin: false,
    limit_degeri: 3,
    limit_periyodu: 'fatura_donemi',
  },
];

export function CommerceView({ veri }: { veri: AdminBolumVerisi<TicaretVerisi> }) {
  const [duzenlenen, setDuzenlenen] = useState<YonetimPaketi | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [bankaHesabi, setBankaHesabi] = useState<
    TicaretVerisi['banka_hesaplari'][number] | 'yeni' | null
  >(null);
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
      <SectionHeader
        baslik="Kullanıcı ve ticaret"
        aciklama="Paket yaşam döngüsü, özellik matrisi, dönemsel kotalar, kullanıcı override'ları, kullanım ve ödemeleri tek sözleşmeden yönetin."
        actions={
          <>
            <Button variant="outline" onClick={() => setOverrideOpen(true)}>
              <UserCog /> Kullanıcı override
            </Button>
            <Button onClick={() => setDuzenlenen(bosPaket())}>
              <PackagePlus /> Paket oluştur
            </Button>
          </>
        }
      />
      <InfrastructureAlert message={veri.uyari} />
      <Tabs defaultValue="paketler">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="paketler">Paket matrisi</TabsTrigger>
          <TabsTrigger value="kullanicilar">Kullanıcı özel kuralları</TabsTrigger>
          <TabsTrigger value="kullanim">Kullanım ve kota</TabsTrigger>
          <TabsTrigger value="odemeler">Ödemeler</TabsTrigger>
          <TabsTrigger value="iban">IBAN hesapları</TabsTrigger>
        </TabsList>
        <TabsContent value="paketler">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {veri.data.paketler.length === 0 ? (
              <Empty text="Henüz paket yok. İlk paketi oluşturarak özellik ve kota matrisini başlatın." />
            ) : (
              veri.data.paketler.map((paket) => (
                <PackageCard key={paket.id} paket={paket} onEdit={setDuzenlenen} />
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="kullanicilar">
          <Overrides rows={veri.data.kullanici_overridelari} />
        </TabsContent>
        <TabsContent value="kullanim">
          <div className="grid gap-3 lg:grid-cols-3">
            {veri.data.kullanim.length === 0 ? (
              <Empty text="Kullanım sayacı henüz oluşmadı." />
            ) : (
              veri.data.kullanim.map((row) => (
                <Card key={row.ozellik_kodu}>
                  <CardHeader>
                    <CardTitle className="font-mono text-sm">{row.ozellik_kodu}</CardTitle>
                    <CardDescription>{row.kullanici_sayisi} kullanıcı</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <Metric label="Toplam" value={row.toplam_kullanim} />
                    <Metric label="Limit aşımı" value={row.limit_asimi} />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="odemeler">
          <Payments rows={veri.data.odemeler} />
        </TabsContent>
        <TabsContent value="iban">
          <BankAccounts rows={veri.data.banka_hesaplari} onEdit={setBankaHesabi} />
        </TabsContent>
      </Tabs>
      <PackageDialog value={duzenlenen} onOpenChange={(open) => !open && setDuzenlenen(null)} />
      <OverrideDialog open={overrideOpen} onOpenChange={setOverrideOpen} data={veri.data} />
      {bankaHesabi && (
        <BankAccountDialog
          key={bankaHesabi === 'yeni' ? 'yeni' : bankaHesabi.id}
          value={bankaHesabi === 'yeni' ? null : bankaHesabi}
          onOpenChange={(open) => !open && setBankaHesabi(null)}
        />
      )}
    </div>
  );
}

function bosPaket(): YonetimPaketi {
  return {
    id: '',
    kod: '',
    ad: '',
    aciklama: '',
    aktif_mi: true,
    gorunur_mi: true,
    satisa_acik_mi: true,
    deneme_gunu: 0,
    seviye: 0,
    donemler: [
      { id: '', donem: 'aylik', sure_ay: 1, fiyat: 0, para_birimi: 'TRY', aktif_mi: true },
    ],
    yetkiler: VARSAYILAN_YETKILER,
  };
}
function Empty({ text }: { text: string }) {
  return (
    <div className="text-muted-foreground col-span-full rounded-xl border border-dashed p-10 text-center text-sm">
      {text}
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted rounded-lg p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value.toLocaleString('tr-TR')}</p>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3">
      <span className="text-xs font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function PackageCard({
  paket,
  onEdit,
}: {
  paket: YonetimPaketi;
  onEdit: (value: YonetimPaketi) => void;
}) {
  const etkin = paket.yetkiler.filter((item) => item.etkin).length;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{paket.ad}</CardTitle>
            <CardDescription className="font-mono">{paket.kod}</CardDescription>
          </div>
          <StatusBadge durum={paket.aktif_mi ? 'onaylandi' : 'iptal'} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground min-h-10 text-sm">
          {paket.aciklama || 'Açıklama yok.'}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Seviye" value={paket.seviye} />
          <Metric label="Yetki" value={etkin} />
          <Metric label="Deneme" value={paket.deneme_gunu} />
        </div>
        <div className="flex flex-wrap gap-1">
          {paket.yetkiler
            .filter((item) => item.etkin)
            .slice(0, 5)
            .map((item) => (
              <Badge key={item.ozellik_kodu} variant="secondary">
                {item.ad}
              </Badge>
            ))}
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => onEdit(structuredClone(paket))}
          >
            <Save /> Özelleştir
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${paket.ad} paketini kopyala`}
            onClick={() =>
              onEdit({
                ...structuredClone(paket),
                id: '',
                kod: `${paket.kod}_kopya`,
                ad: `${paket.ad} Kopya`,
              })
            }
          >
            <Copy />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PackageDialog({
  value,
  onOpenChange,
}: {
  value: YonetimPaketi | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState<YonetimPaketi | null>(null);
  const [isPending, startTransition] = useTransition();
  const current = draft?.id === value?.id && draft?.kod === value?.kod ? draft : value;
  function update(patch: Partial<YonetimPaketi>) {
    setDraft({ ...(current ?? bosPaket()), ...patch });
  }
  function save() {
    if (!current) return;
    startTransition(async () => {
      const result = await paketKaydetAction({
        id: current.id || null,
        kod: current.kod,
        ad: current.ad,
        aciklama: current.aciklama || null,
        aktifMi: current.aktif_mi,
        gorunurMu: current.gorunur_mi,
        satisaAcikMi: current.satisa_acik_mi,
        denemeGunu: current.deneme_gunu,
        seviye: current.seviye,
        donemler: current.donemler,
        yetkiler: current.yetkiler,
      });
      if (result.ok) {
        toast.success('Paket sözleşmesi kaydedildi.');
        onOpenChange(false);
      } else toast.error(result.error);
    });
  }
  return (
    <Dialog open={Boolean(value)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        {current && (
          <>
            <DialogHeader>
              <DialogTitle>
                {current.id ? `${current.ad} paketini özelleştir` : 'Yeni paket oluştur'}
              </DialogTitle>
              <DialogDescription>
                Görünürlük, satış, deneme, fiyat dönemleri, özellikler ve dönemsel kotalar birlikte
                sürümlenir.
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="temel">
              <TabsList>
                <TabsTrigger value="temel">Temel</TabsTrigger>
                <TabsTrigger value="fiyat">Fiyat dönemleri</TabsTrigger>
                <TabsTrigger value="yetki">Özellik ve kotalar</TabsTrigger>
              </TabsList>
              <TabsContent value="temel" className="grid gap-4 py-3 md:grid-cols-2">
                <Field label="Paket kodu">
                  <Input
                    className="h-10"
                    value={current.kod}
                    onChange={(e) => update({ kod: e.target.value })}
                    disabled={Boolean(current.id)}
                  />
                </Field>
                <Field label="Paket adı">
                  <Input
                    className="h-10"
                    value={current.ad}
                    onChange={(e) => update({ ad: e.target.value })}
                  />
                </Field>
                <Field label="Seviye">
                  <Input
                    type="number"
                    className="h-10"
                    value={current.seviye}
                    onChange={(e) => update({ seviye: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Deneme günü">
                  <Input
                    type="number"
                    className="h-10"
                    value={current.deneme_gunu}
                    onChange={(e) => update({ deneme_gunu: Number(e.target.value) })}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Açıklama">
                    <Textarea
                      rows={3}
                      value={current.aciklama ?? ''}
                      onChange={(e) => update({ aciklama: e.target.value })}
                    />
                  </Field>
                </div>
                <Toggle
                  label="Paket etkin"
                  checked={current.aktif_mi}
                  onChange={(v) => update({ aktif_mi: v })}
                />
                <Toggle
                  label="Katalogda görünür"
                  checked={current.gorunur_mi}
                  onChange={(v) => update({ gorunur_mi: v })}
                />
                <Toggle
                  label="Satışa açık"
                  checked={current.satisa_acik_mi}
                  onChange={(v) => update({ satisa_acik_mi: v })}
                />
              </TabsContent>
              <TabsContent value="fiyat" className="space-y-3 py-3">
                {current.donemler.map((donem, index) => (
                  <div
                    key={`${donem.donem}-${index}`}
                    className="grid gap-3 rounded-xl border p-3 md:grid-cols-5"
                  >
                    <Field label="Dönem">
                      <Select
                        value={donem.donem}
                        onValueChange={(v: 'aylik' | 'yillik') =>
                          update({
                            donemler: current.donemler.map((d, i) =>
                              i === index ? { ...d, donem: v, sure_ay: v === 'aylik' ? 1 : 12 } : d,
                            ),
                          })
                        }
                      >
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aylik">Aylık</SelectItem>
                          <SelectItem value="yillik">Yıllık</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Süre (ay)">
                      <Input
                        className="h-10"
                        type="number"
                        value={donem.sure_ay}
                        onChange={(e) =>
                          update({
                            donemler: current.donemler.map((d, i) =>
                              i === index ? { ...d, sure_ay: Number(e.target.value) } : d,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field label="Fiyat">
                      <Input
                        className="h-10"
                        type="number"
                        value={donem.fiyat ?? ''}
                        onChange={(e) =>
                          update({
                            donemler: current.donemler.map((d, i) =>
                              i === index ? { ...d, fiyat: Number(e.target.value) } : d,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field label="Para birimi">
                      <Input
                        className="h-10"
                        value={donem.para_birimi}
                        onChange={(e) =>
                          update({
                            donemler: current.donemler.map((d, i) =>
                              i === index ? { ...d, para_birimi: e.target.value.toUpperCase() } : d,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Toggle
                      label="Etkin"
                      checked={donem.aktif_mi}
                      onChange={(v) =>
                        update({
                          donemler: current.donemler.map((d, i) =>
                            i === index ? { ...d, aktif_mi: v } : d,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="yetki">
                <Entitlements current={current} update={update} />
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Vazgeç
              </Button>
              {current.id && (
                <Button
                  variant="outline"
                  onClick={() => update({ aktif_mi: false, satisa_acik_mi: false })}
                >
                  <Archive /> Arşivle
                </Button>
              )}
              <Button onClick={save} disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : <Save />} Kaydet
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Entitlements({
  current,
  update,
}: {
  current: YonetimPaketi;
  update: (patch: Partial<YonetimPaketi>) => void;
}) {
  const kategoriler = Array.from(new Set(current.yetkiler.map((item) => item.kategori)));
  return (
    <Accordion type="multiple" defaultValue={kategoriler}>
      {kategoriler.map((kategori) => (
        <AccordionItem key={kategori} value={kategori}>
          <AccordionTrigger>{kategori}</AccordionTrigger>
          <AccordionContent className="space-y-2">
            {current.yetkiler.map(
              (yetki, index) =>
                yetki.kategori === kategori && (
                  <div
                    key={yetki.ozellik_kodu}
                    className="grid items-center gap-3 rounded-lg border p-3 md:grid-cols-[1fr_100px_140px_160px]"
                  >
                    <div>
                      <p className="font-medium">{yetki.ad}</p>
                      <p className="text-muted-foreground font-mono text-[10px]">
                        {yetki.ozellik_kodu}
                      </p>
                    </div>
                    <Toggle
                      label="Etkin"
                      checked={yetki.etkin}
                      onChange={(v) =>
                        update({
                          yetkiler: current.yetkiler.map((item, i) =>
                            i === index ? { ...item, etkin: v } : item,
                          ),
                        })
                      }
                    />
                    {yetki.deger_turu !== 'boolean' ? (
                      <>
                        <Field label="Limit">
                          <Input
                            className="h-9"
                            type="number"
                            value={yetki.limit_degeri ?? ''}
                            onChange={(e) =>
                              update({
                                yetkiler: current.yetkiler.map((item, i) =>
                                  i === index
                                    ? { ...item, limit_degeri: Number(e.target.value) }
                                    : item,
                                ),
                              })
                            }
                          />
                        </Field>
                        <Field label="Periyot">
                          <Select
                            value={yetki.limit_periyodu ?? 'aylik'}
                            onValueChange={(v: NonNullable<PaketYetkisi['limit_periyodu']>) =>
                              update({
                                yetkiler: current.yetkiler.map((item, i) =>
                                  i === index ? { ...item, limit_periyodu: v } : item,
                                ),
                              })
                            }
                          >
                            <SelectTrigger className="h-9 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gunluk">Günlük</SelectItem>
                              <SelectItem value="aylik">Aylık</SelectItem>
                              <SelectItem value="fatura_donemi">Fatura dönemi</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      </>
                    ) : (
                      <div className="text-muted-foreground text-xs md:col-span-2">
                        Boolean erişim
                      </div>
                    )}
                  </div>
                ),
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function Overrides({ rows }: { rows: TicaretVerisi['kullanici_overridelari'] }) {
  return (
    <Card className="gap-0 py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kullanıcı</TableHead>
            <TableHead>Özellik</TableHead>
            <TableHead>Kural</TableHead>
            <TableHead>Limit</TableHead>
            <TableHead>Bitiş</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground h-32 text-center">
                Kullanıcı bazlı override bulunmuyor.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p>{row.eposta ?? row.kullanici_id}</p>
                  <p className="text-muted-foreground font-mono text-[10px]">{row.kullanici_id}</p>
                </TableCell>
                <TableCell className="font-mono">{row.ozellik_kodu}</TableCell>
                <TableCell>
                  <Badge variant={row.karar === 'yasak' ? 'destructive' : 'outline'}>
                    {row.karar}
                  </Badge>
                </TableCell>
                <TableCell>{row.limit_degeri ?? '—'}</TableCell>
                <TableCell>{formatDate(row.bitis_tarihi)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function OverrideDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TicaretVerisi;
}) {
  const [userId, setUserId] = useState('');
  const [feature, setFeature] = useState('poz.detay');
  const [decision, setDecision] = useState<'izin' | 'yasak' | 'limit'>('izin');
  const [limit, setLimit] = useState(0);
  const [expiry, setExpiry] = useState('');
  const [reason, setReason] = useState(
    'Admin tarafından kullanıcı ihtiyacına göre özelleştirildi.',
  );
  const [cozum, setCozum] = useState<Record<string, unknown> | null>(null);
  const [isPending, startTransition] = useTransition();
  const features = useMemo(
    () =>
      Array.from(
        new Set([
          ...VARSAYILAN_YETKILER.map((x) => x.ozellik_kodu),
          ...data.paketler.flatMap((p) => p.yetkiler.map((x) => x.ozellik_kodu)),
        ]),
      ),
    [data.paketler],
  );
  function save() {
    startTransition(async () => {
      const result = await kullaniciOverrideKaydetAction({
        kullaniciId: userId,
        ozellikKodu: feature,
        karar: decision,
        limitDegeri: decision === 'limit' ? limit : null,
        bitisTarihi: expiry ? new Date(expiry).toISOString() : null,
        gerekce: reason,
      });
      if (result.ok) {
        toast.success('Kullanıcı kuralı kaydedildi.');
        onOpenChange(false);
      } else toast.error(result.error);
    });
  }
  function coz() {
    startTransition(async () => {
      const result = await yetkiCozAction({ kullaniciId: userId, ozellikKodu: feature });
      if (result.ok) setCozum((result.data ?? {}) as Record<string, unknown>);
      else toast.error(result.error);
    });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kullanıcı erişimini özelleştir</DialogTitle>
          <DialogDescription>
            Kullanıcı kuralı paket kuralından önceliklidir; bitiş tarihinde kendiliğinden devre dışı
            kalır.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Kullanıcı">
            {data.kullanicilar.length ? (
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Kullanıcı seçin" />
                </SelectTrigger>
                <SelectContent>
                  {data.kullanicilar.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.eposta ?? u.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="h-10"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Kullanıcı UUID"
              />
            )}
          </Field>
          <Field label="Özellik">
            <Select value={feature} onValueChange={setFeature}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {features.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Kural">
            <Select value={decision} onValueChange={(v: typeof decision) => setDecision(v)}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="izin">İzin ver</SelectItem>
                <SelectItem value="yasak">Yasakla</SelectItem>
                <SelectItem value="limit">Özel limit</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {decision === 'limit' && (
            <Field label="Limit">
              <Input
                className="h-10"
                type="number"
                min={0}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
            </Field>
          )}
          <Field label="Bitiş tarihi (isteğe bağlı)">
            <Input
              className="h-10"
              type="datetime-local"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </Field>
          <Field label="Gerekçe">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          {cozum && (
            <div className="bg-muted/40 rounded-lg border p-3 text-xs">
              <p className="mb-2 font-medium">Geçerli yetki çözümü</p>
              <dl className="grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-muted-foreground">Karar</dt>
                  <dd>{cozum.izin ? 'İzin var' : 'İzin yok'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Kazanan kural</dt>
                  <dd className="font-mono">{String(cozum.kaynak ?? 'yok')}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Limit / kullanım</dt>
                  <dd>
                    {String(cozum.limit ?? '∞')} / {String(cozum.kullanim ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Kalan</dt>
                  <dd>{String(cozum.kalan ?? '∞')}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={coz} disabled={isPending || !userId}>
            Geçerli kuralı çöz
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={save} disabled={isPending || !userId}>
            {isPending ? <Loader2 className="animate-spin" /> : <Shield />} Kuralı kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Payments({ rows }: { rows: TicaretVerisi['odemeler'] }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  function decide(id: string, decision: 'onayla' | 'reddet') {
    startTransition(async () => {
      const result = await odemeKarariAction({ id, karar: decision, not: notes[id] ?? '' });
      if (result.ok) toast.success('Ödeme kararı kaydedildi.');
      else toast.error(result.error);
    });
  }
  return (
    <Card className="gap-0 py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kullanıcı</TableHead>
            <TableHead>Paket</TableHead>
            <TableHead>Tutar</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Admin notu ve karar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground h-32 text-center">
                Ödeme bildirimi yok.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p>{row.eposta ?? '—'}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {formatDate(row.olusturulma_zamani)}
                  </p>
                </TableCell>
                <TableCell>{row.paket ?? '—'}</TableCell>
                <TableCell className="font-mono">
                  {new Intl.NumberFormat('tr-TR', {
                    style: 'currency',
                    currency: row.para_birimi,
                  }).format(row.tutar)}
                </TableCell>
                <TableCell>
                  <StatusBadge durum={row.durum} />
                </TableCell>
                <TableCell>
                  <div className="flex min-w-80 gap-2">
                    <Input
                      className="h-9"
                      value={notes[row.id] ?? ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))}
                      placeholder="Karar notu"
                    />
                    {row.durum === 'bekliyor' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => decide(row.id, 'reddet')}
                          disabled={isPending}
                        >
                          <X /> Reddet
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => decide(row.id, 'onayla')}
                          disabled={isPending}
                        >
                          {isPending ? <Loader2 className="animate-spin" /> : <Check />} Onayla
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function BankAccounts({
  rows,
  onEdit,
}: {
  rows: TicaretVerisi['banka_hesaplari'];
  onEdit: (value: TicaretVerisi['banka_hesaplari'][number] | 'yeni') => void;
}) {
  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="text-primary size-4" /> Ödeme hesapları
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Aktif hesaplar ödeme bildirim ekranında kullanıcılara gösterilir.
          </p>
        </div>
        <Button onClick={() => onEdit('yeni')}>
          <Plus /> Hesap ekle
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Banka / alıcı</TableHead>
            <TableHead>IBAN</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Güncelleme</TableHead>
            <TableHead className="text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground h-32 text-center">
                Kayıtlı ödeme hesabı yok.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-medium">{row.banka_adi}</p>
                  <p className="text-muted-foreground text-xs">{row.alici_adi}</p>
                </TableCell>
                <TableCell className="font-mono text-xs">{formatIban(row.iban)}</TableCell>
                <TableCell>
                  <Badge variant={row.aktif_mi ? 'outline' : 'secondary'}>
                    {row.aktif_mi ? 'Aktif' : 'Gizli'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{formatDate(row.guncellenme_zamani)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label={`${row.banka_adi} hesabını düzenle`}
                    onClick={() => onEdit(row)}
                  >
                    <Pencil />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function BankAccountDialog({
  value,
  onOpenChange,
}: {
  value: TicaretVerisi['banka_hesaplari'][number] | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState({
    id: value?.id ?? null,
    bankaAdi: value?.banka_adi ?? '',
    aliciAdi: value?.alici_adi ?? '',
    iban: value?.iban ?? '',
    aciklama: value?.aciklama ?? '',
    aktifMi: value?.aktif_mi ?? true,
  });
  const [isPending, startTransition] = useTransition();
  function kaydet() {
    startTransition(async () => {
      const sonuc = await bankaHesabiKaydetAction({
        ...draft,
        aciklama: draft.aciklama || null,
      });
      if (!sonuc.ok) {
        toast.error(sonuc.error);
        return;
      }
      toast.success('Ödeme hesabı kaydedildi.');
      onOpenChange(false);
    });
  }
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{value ? 'Ödeme hesabını düzenle' : 'Ödeme hesabı ekle'}</DialogTitle>
          <DialogDescription>
            IBAN boşluksuz doğrulanır; kullanıcı görünürlüğünü durum anahtarı belirler.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Banka adı">
            <Input
              value={draft.bankaAdi}
              onChange={(event) => setDraft({ ...draft, bankaAdi: event.target.value })}
            />
          </Field>
          <Field label="Alıcı adı">
            <Input
              value={draft.aliciAdi}
              onChange={(event) => setDraft({ ...draft, aliciAdi: event.target.value })}
            />
          </Field>
          <Field label="TR IBAN">
            <Input
              className="font-mono"
              value={draft.iban}
              onChange={(event) => setDraft({ ...draft, iban: event.target.value.toUpperCase() })}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
            />
          </Field>
          <Field label="Açıklama">
            <Textarea
              value={draft.aciklama}
              onChange={(event) => setDraft({ ...draft, aciklama: event.target.value })}
            />
          </Field>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3">
            <span className="text-sm font-medium">Kullanıcılara göster</span>
            <Switch
              checked={draft.aktifMi}
              onCheckedChange={(aktifMi) => setDraft({ ...draft, aktifMi })}
            />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={kaydet} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Save />} Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatIban(value: string) {
  return value
    .replace(/\s+/g, '')
    .replace(/(.{4})/g, '$1 ')
    .trim();
}
