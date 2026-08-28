'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  Check,
  CircleAlert,
  CreditCard,
  FileUp,
  Landmark,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@features/auth/context';
import { createClient } from '@shared/lib/supabase/client';
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

interface Donem {
  id: string;
  donem: string;
  sure_ay: number;
  fiyat: number;
  para_birimi: string;
}

interface Paket {
  id: string;
  kod: string;
  ad: string;
  aciklama: string | null;
  paket_donemleri: Donem[];
  paket_ozellikleri: Array<{ ozellikler: { ad: string; aciklama: string } | null }>;
}

interface BankaHesabi {
  id: string;
  banka_adi: string;
  alici_adi: string;
  iban: string;
  aciklama: string | null;
}

interface Abonelik {
  id: string;
  baslangic_zamani: string;
  bitis_zamani: string | null;
  durum: string;
  uyelik_paketleri: { ad: string } | null;
}

interface Odeme {
  id: string;
  tutar: number;
  para_birimi: string;
  durum: string;
  admin_notu: string | null;
  olusturulma_zamani: string;
  paket_donemleri: { donem: string; uyelik_paketleri: { ad: string } | null } | null;
}

export function UyelikPaneli() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [paketler, setPaketler] = useState<Paket[]>([]);
  const [bankalar, setBankalar] = useState<BankaHesabi[]>([]);
  const [abonelikler, setAbonelikler] = useState<Abonelik[]>([]);
  const [odemeler, setOdemeler] = useState<Odeme[]>([]);
  const [seciliDonem, setSeciliDonem] = useState('');
  const [seciliBanka, setSeciliBanka] = useState('');
  const [dekont, setDekont] = useState<File | null>(null);
  const [aciklama, setAciklama] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const yukle = useCallback(async () => {
    const [paketRes, bankaRes, abonelikRes, odemeRes] = await Promise.all([
      supabase
        .from('uyelik_paketleri')
        .select(
          'id, kod, ad, aciklama, paket_donemleri(id, donem, sure_ay, fiyat, para_birimi), paket_ozellikleri(ozellikler(ad, aciklama))',
        )
        .eq('aktif_mi', true)
        .order('seviye'),
      supabase
        .from('banka_hesaplari')
        .select('id, banka_adi, alici_adi, iban, aciklama')
        .eq('aktif_mi', true),
      supabase
        .from('abonelikler')
        .select('id, baslangic_zamani, bitis_zamani, durum, uyelik_paketleri(ad)')
        .order('olusturulma_zamani', { ascending: false }),
      supabase
        .from('odeme_bildirimleri')
        .select(
          'id, tutar, para_birimi, durum, admin_notu, olusturulma_zamani, paket_donemleri(donem, uyelik_paketleri(ad))',
        )
        .order('olusturulma_zamani', { ascending: false }),
    ]);
    const hata = [paketRes.error, bankaRes.error, abonelikRes.error, odemeRes.error].find(Boolean);
    if (hata) toast.error(hata.message);
    setPaketler((paketRes.data ?? []) as unknown as Paket[]);
    setBankalar((bankaRes.data ?? []) as BankaHesabi[]);
    setAbonelikler((abonelikRes.data ?? []) as unknown as Abonelik[]);
    setOdemeler((odemeRes.data ?? []) as unknown as Odeme[]);
    setYukleniyor(false);
  }, [supabase]);

  useEffect(() => {
    const zamanlayici = window.setTimeout(() => void yukle(), 0);
    return () => window.clearTimeout(zamanlayici);
  }, [yukle]);

  const seciliDonemBilgisi = useMemo(
    () =>
      paketler
        .flatMap((paket) => paket.paket_donemleri.map((donem) => ({ paket, donem })))
        .find((item) => item.donem.id === seciliDonem),
    [paketler, seciliDonem],
  );

  async function bildirimGonder(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !dekont || !seciliDonem || !seciliBanka) return;
    setGonderiliyor(true);
    const guvenliAd = dekont.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const yol = `${user.id}/${crypto.randomUUID()}-${guvenliAd}`;
    const yukleme = await supabase.storage.from('odeme-dekontlari').upload(yol, dekont, {
      cacheControl: '3600',
      upsert: false,
    });
    if (yukleme.error) {
      toast.error(`Dekont yüklenemedi: ${yukleme.error.message}`);
      setGonderiliyor(false);
      return;
    }
    const { error } = await supabase.rpc('odeme_bildirimi_olustur', {
      p_paket_donemi_id: seciliDonem,
      p_banka_hesabi_id: seciliBanka,
      p_dekont_yolu: yol,
      p_aciklama: aciklama || null,
    });
    if (error) {
      await supabase.storage.from('odeme-dekontlari').remove([yol]);
      toast.error(error.message);
    } else {
      toast.success('Ödeme bildiriminiz alındı. Admin incelemesinden sonra üyeliğiniz başlayacak.');
      setDekont(null);
      setAciklama('');
      setSeciliDonem('');
      await yukle();
    }
    setGonderiliyor(false);
  }

  if (yukleniyor) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Üyelik ve ödeme</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Paketinizi seçin, IBAN’a ödeme yaptıktan sonra dekontu yükleyin.
          </p>
        </div>

        {abonelikler.find((abonelik) => abonelik.durum === 'aktif') && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <BadgeCheck className="size-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">
                Aktif paket: {abonelikler.find((a) => a.durum === 'aktif')?.uyelik_paketleri?.ad}
              </p>
              <p className="text-muted-foreground text-xs">
                Bitiş:{' '}
                {abonelikler.find((a) => a.durum === 'aktif')?.bitis_zamani
                  ? new Date(
                      abonelikler.find((a) => a.durum === 'aktif')!.bitis_zamani!,
                    ).toLocaleDateString('tr-TR')
                  : 'Süresiz'}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {paketler.map((paket) => (
            <Card key={paket.id} className={paket.kod === 'pro' ? 'border-primary/40' : undefined}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{paket.ad}</CardTitle>
                  {paket.kod === 'pro' && <Badge>En kapsamlı</Badge>}
                </div>
                <CardDescription>{paket.aciklama}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {paket.paket_ozellikleri.length === 0 ? (
                    <p className="text-muted-foreground flex items-start gap-2 text-sm">
                      <CircleAlert className="mt-0.5 size-4 shrink-0" />
                      Admin bu paket için henüz veri özelliği açmadı.
                    </p>
                  ) : (
                    paket.paket_ozellikleri.map((item) => (
                      <div key={item.ozellikler?.ad} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span>{item.ozellikler?.ad}</span>
                      </div>
                    ))
                  )}
                </div>
                {paket.paket_donemleri.map((donem) => (
                  <button
                    key={donem.id}
                    type="button"
                    onClick={() => setSeciliDonem(donem.id)}
                    className={`flex min-h-11 w-full cursor-pointer items-center justify-between rounded-md border px-3 text-sm ${seciliDonem === donem.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                  >
                    <span className="capitalize">{donem.donem}</span>
                    <strong>
                      {Number(donem.fiyat).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                      {donem.para_birimi}
                    </strong>
                  </button>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {seciliDonemBilgisi && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4" />
                Ödeme bildirimi
              </CardTitle>
              <CardDescription>
                {seciliDonemBilgisi.paket.ad} · {seciliDonemBilgisi.donem.donem}. Ödemeyi yaptıktan
                sonra dekontunuzu gönderin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={bildirimGonder} className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label>Banka hesabı</Label>
                  {bankalar.length === 0 ? (
                    <div
                      role="alert"
                      className="border-destructive/30 bg-destructive/10 rounded-md border p-3 text-sm"
                    >
                      Admin henüz aktif IBAN tanımlamadı.
                    </div>
                  ) : (
                    bankalar.map((banka) => (
                      <label
                        key={banka.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${seciliBanka === banka.id ? 'border-primary bg-primary/5' : ''}`}
                      >
                        <input
                          className="mt-1"
                          type="radio"
                          name="banka"
                          value={banka.id}
                          checked={seciliBanka === banka.id}
                          onChange={() => setSeciliBanka(banka.id)}
                        />
                        <Landmark className="mt-0.5 size-4" />
                        <span>
                          <span className="block text-sm font-medium">
                            {banka.banka_adi} · {banka.alici_adi}
                          </span>
                          <span className="block font-mono text-xs">{banka.iban}</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="dekont">Dekont (PDF/JPG/PNG/WebP, en fazla 10 MB)</Label>
                    <Input
                      id="dekont"
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      onChange={(e) => setDekont(e.target.files?.[0] ?? null)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="odeme-aciklama">Açıklama (isteğe bağlı)</Label>
                    <Input
                      id="odeme-aciklama"
                      value={aciklama}
                      onChange={(e) => setAciklama(e.target.value)}
                      placeholder="Banka işlem referansı veya not"
                    />
                  </div>
                  <Button type="submit" disabled={gonderiliyor || !dekont || !seciliBanka}>
                    {gonderiliyor ? <Loader2 className="animate-spin" /> : <FileUp />}Dekontu gönder
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4" />
              Ödeme geçmişi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {odemeler.length === 0 ? (
              <p className="text-muted-foreground text-sm">Henüz ödeme bildiriminiz yok.</p>
            ) : (
              odemeler.map((odeme) => (
                <div
                  key={odeme.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {odeme.paket_donemleri?.uyelik_paketleri?.ad} · {odeme.paket_donemleri?.donem}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(odeme.olusturulma_zamani).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <span className="ml-auto font-mono text-sm">
                    {Number(odeme.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                    {odeme.para_birimi}
                  </span>
                  <Badge
                    variant={
                      odeme.durum === 'bekliyor'
                        ? 'default'
                        : odeme.durum === 'onaylandi'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {odeme.durum}
                  </Badge>
                  {odeme.admin_notu && (
                    <p className="text-muted-foreground w-full text-xs">
                      Admin notu: {odeme.admin_notu}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
