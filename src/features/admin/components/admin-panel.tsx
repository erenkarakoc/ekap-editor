'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  BookOpen,
  Building2,
  Check,
  CircleAlert,
  CircleDollarSign,
  Database,
  FileSpreadsheet,
  Landmark,
  Loader2,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { aktarimDosyasiniOku, aktarimSatirlariniDogrula } from '@features/admin/lib/import-parser';
import type { AktarimDosyasi, PozAktarimSatiri } from '@features/admin/types';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/components/ui/table';
import { cn } from '@shared/lib/utils';

type Sekme = 'genel' | 'kaynaklar' | 'aktarim' | 'paketler' | 'odemeler';

interface PaketDonemi {
  id: string;
  donem: 'aylik' | 'yillik';
  sure_ay: number;
  fiyat: number | null;
  para_birimi: string;
  aktif_mi: boolean;
}

interface Paket {
  id: string;
  kod: string;
  ad: string;
  aciklama: string | null;
  aktif_mi: boolean;
  paket_donemleri: PaketDonemi[];
}

interface Ozellik {
  kod: string;
  ad: string;
  aciklama: string;
  kategori: string;
  sira_no: number;
}

interface PaketOzelligi {
  paket_id: string;
  ozellik_kodu: string;
}

interface BankaHesabi {
  id: string;
  banka_adi: string;
  alici_adi: string;
  iban: string;
  aciklama: string | null;
  aktif_mi: boolean;
}

interface Yayin {
  id: string;
  baslik: string;
  donem_etiketi_ham: string;
  dogrudan_belge_url: string | null;
  kitap_ailesi_id: string;
  kurumlar: { ad: string } | null;
  kitap_aileleri: { ad: string } | null;
}

interface Fasikul {
  id: string;
  kitap_ailesi_id: string;
  ad_ham: string;
}

interface Odeme {
  id: string;
  kullanici_id: string;
  tutar: number;
  para_birimi: string;
  durum: string;
  dekont_yolu: string;
  kullanici_aciklamasi: string | null;
  admin_notu: string | null;
  olusturulma_zamani: string;
  kullanici_profilleri: { eposta: string; ad_soyad: string | null } | null;
  paket_donemleri: {
    donem: string;
    uyelik_paketleri: { ad: string } | null;
  } | null;
}

interface AktarimCalismasi {
  id: string;
  durum: string;
  islenen_surum_sayisi: number;
  islenen_fiyat_sayisi: number;
  baslama_zamani: string | null;
  yayinlar: { baslik: string; donem_etiketi_ham: string } | null;
}

interface KaynakFormu {
  kurum_kodu: string;
  kurum_adi: string;
  kurum_resmi_adi: string;
  kurum_url: string;
  katalog_anahtari: string;
  katalog_adi: string;
  kaynak_sayfasi_url: string;
  kitap_anahtari: string;
  kitap_adi: string;
  disiplin: string;
  fasikul_adi: string;
  yayin_basligi: string;
  yayin_turu: string;
  donem_etiketi: string;
  yil: string;
  ay: string;
  revizyon: string;
  belge_url: string;
  hak_durumu: string;
}

const BOS_KAYNAK_FORMU: KaynakFormu = {
  kurum_kodu: 'CSIDB',
  kurum_adi: 'Çevre, Şehircilik ve İklim Değişikliği Bakanlığı',
  kurum_resmi_adi: '',
  kurum_url: 'https://www.csb.gov.tr/',
  katalog_anahtari: 'CSIDB_BIRIM_FIYAT',
  katalog_adi: 'Resmî birim fiyat yayınları',
  kaynak_sayfasi_url: 'https://yfk.csb.gov.tr/',
  kitap_anahtari: '',
  kitap_adi: '',
  disiplin: '',
  fasikul_adi: '',
  yayin_basligi: '',
  yayin_turu: 'unit_price_book',
  donem_etiketi: '',
  yil: String(new Date().getFullYear()),
  ay: '',
  revizyon: '0',
  belge_url: '',
  hak_durumu: 'review_required',
};

const SEKME_LISTESI: Array<{ id: Sekme; ad: string; icon: typeof Database }> = [
  { id: 'genel', ad: 'Kurulum', icon: ShieldCheck },
  { id: 'kaynaklar', ad: 'Kaynak ve yayınlar', icon: BookOpen },
  { id: 'aktarim', ad: 'Poz aktarımı', icon: FileSpreadsheet },
  { id: 'paketler', ad: 'Paket ve IBAN', icon: Settings2 },
  { id: 'odemeler', ad: 'Ödeme onayları', icon: CircleDollarSign },
];

function FormAlani({
  id,
  etiket,
  aciklama,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  id: string;
  etiket: string;
  aciklama?: string;
  value: string;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etiket}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        aria-describedby={aciklama ? `${id}-yardim` : undefined}
      />
      {aciklama && (
        <p id={`${id}-yardim`} className="text-muted-foreground text-xs">
          {aciklama}
        </p>
      )}
    </div>
  );
}

export function AdminPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [sekme, setSekme] = useState<Sekme>('genel');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [paketler, setPaketler] = useState<Paket[]>([]);
  const [ozellikler, setOzellikler] = useState<Ozellik[]>([]);
  const [paketOzellikleri, setPaketOzellikleri] = useState<PaketOzelligi[]>([]);
  const [bankaHesaplari, setBankaHesaplari] = useState<BankaHesabi[]>([]);
  const [yayinlar, setYayinlar] = useState<Yayin[]>([]);
  const [fasikuller, setFasikuller] = useState<Fasikul[]>([]);
  const [odemeler, setOdemeler] = useState<Odeme[]>([]);
  const [aktarimlar, setAktarimlar] = useState<AktarimCalismasi[]>([]);
  const [kaynakFormu, setKaynakFormu] = useState<KaynakFormu>(BOS_KAYNAK_FORMU);
  const [kaynakKaydediliyor, setKaynakKaydediliyor] = useState(false);
  const [bankaFormu, setBankaFormu] = useState({
    banka_adi: '',
    alici_adi: '',
    iban: '',
    aciklama: '',
  });
  const [seciliYayin, setSeciliYayin] = useState('');
  const [seciliFasikul, setSeciliFasikul] = useState('');
  const [aktarimDosyasi, setAktarimDosyasi] = useState<AktarimDosyasi | null>(null);
  const [aktarimYuzdesi, setAktarimYuzdesi] = useState<number | null>(null);
  const [aktariliyor, setAktariliyor] = useState(false);
  const [dosyaHatasi, setDosyaHatasi] = useState<string | null>(null);
  const [odemeNotlari, setOdemeNotlari] = useState<Record<string, string>>({});

  const verileriYukle = useCallback(async () => {
    setYukleniyor(true);
    const [
      paketRes,
      ozellikRes,
      paketOzellikRes,
      bankaRes,
      yayinRes,
      fasikulRes,
      aktarimRes,
      odemeRes,
    ] = await Promise.all([
      supabase.from('uyelik_paketleri').select('*, paket_donemleri(*)').order('seviye'),
      supabase.from('ozellikler').select('*').order('sira_no'),
      supabase.from('paket_ozellikleri').select('*'),
      supabase.from('banka_hesaplari').select('*').order('olusturulma_zamani'),
      supabase
        .from('yayinlar')
        .select(
          'id, baslik, donem_etiketi_ham, dogrudan_belge_url, kitap_ailesi_id, kurumlar(ad), kitap_aileleri(ad)',
        )
        .order('donem_sirasi', { ascending: false }),
      supabase.from('fasikuller').select('id, kitap_ailesi_id, ad_ham').order('sira_no'),
      supabase
        .from('aktarim_calismalari')
        .select(
          'id, durum, islenen_surum_sayisi, islenen_fiyat_sayisi, baslama_zamani, yayinlar(baslik, donem_etiketi_ham)',
        )
        .in('durum', ['running', 'failed', 'needs_review'])
        .order('olusturulma_zamani', { ascending: false }),
      supabase
        .from('odeme_bildirimleri')
        .select(
          '*, kullanici_profilleri(eposta, ad_soyad), paket_donemleri(donem, uyelik_paketleri(ad))',
        )
        .order('olusturulma_zamani', { ascending: false }),
    ]);

    const hata = [
      paketRes.error,
      ozellikRes.error,
      paketOzellikRes.error,
      bankaRes.error,
      yayinRes.error,
      fasikulRes.error,
      aktarimRes.error,
      odemeRes.error,
    ].find(Boolean);
    if (hata) toast.error(`Admin verileri yüklenemedi: ${hata.message}`);
    setPaketler((paketRes.data ?? []) as unknown as Paket[]);
    setOzellikler((ozellikRes.data ?? []) as Ozellik[]);
    setPaketOzellikleri((paketOzellikRes.data ?? []) as PaketOzelligi[]);
    setBankaHesaplari((bankaRes.data ?? []) as BankaHesabi[]);
    setYayinlar((yayinRes.data ?? []) as unknown as Yayin[]);
    setFasikuller((fasikulRes.data ?? []) as Fasikul[]);
    setAktarimlar((aktarimRes.data ?? []) as unknown as AktarimCalismasi[]);
    setOdemeler((odemeRes.data ?? []) as unknown as Odeme[]);
    setYukleniyor(false);
  }, [supabase]);

  useEffect(() => {
    void verileriYukle();
  }, [verileriYukle]);

  const kurulum = useMemo(
    () => [
      {
        ad: 'Admin hesabı',
        tamam: true,
        aciklama: 'Rol, doğrulanmış kullanıcı metadata alanından denetlenir.',
      },
      {
        ad: 'Banka hesabı',
        tamam: bankaHesaplari.some((hesap) => hesap.aktif_mi),
        aciklama: 'Ödeme ekranında gösterilecek en az bir aktif IBAN.',
      },
      {
        ad: 'Paket fiyatları',
        tamam: paketler.some((paket) =>
          paket.paket_donemleri.some((donem) => donem.aktif_mi && donem.fiyat !== null),
        ),
        aciklama: 'Standart veya Pro için aktif aylık/yıllık fiyat.',
      },
      {
        ad: 'Paket özellikleri',
        tamam: paketOzellikleri.length > 0,
        aciklama: 'Başlangıçta tüm veri özellikleri bilinçli olarak kilitlidir.',
      },
      {
        ad: 'Kaynak yayını',
        tamam: yayinlar.length > 0,
        aciklama: 'Kurum, kitap, fasikül ve ay/yıl bilgisi olan resmî yayın.',
      },
    ],
    [bankaHesaplari, paketler, paketOzellikleri, yayinlar],
  );

  async function kaynakKaydet(event: React.FormEvent) {
    event.preventDefault();
    setKaynakKaydediliyor(true);
    const { data, error } = await supabase.rpc('admin_kaynak_yayini_kaydet', {
      p_veri: kaynakFormu,
    });
    setKaynakKaydediliyor(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const sonuc = data as { yayin_id?: string; fasikul_id?: string } | null;
    if (sonuc?.yayin_id) setSeciliYayin(sonuc.yayin_id);
    if (sonuc?.fasikul_id) setSeciliFasikul(sonuc.fasikul_id);
    toast.success('Kaynak ve yayın kaydedildi. Şimdi poz dosyasını aktarabilirsiniz.');
    await verileriYukle();
    setSekme('aktarim');
  }

  async function dosyaSec(file: File | null) {
    setDosyaHatasi(null);
    setAktarimDosyasi(null);
    if (!file) return;
    try {
      const sonuc = await aktarimDosyasiniOku(file);
      setAktarimDosyasi(sonuc);
    } catch (error) {
      setDosyaHatasi(error instanceof Error ? error.message : 'Dosya okunamadı.');
    }
  }

  function satirGuncelle(index: number, alan: keyof PozAktarimSatiri, value: string) {
    setAktarimDosyasi((onceki) => {
      if (!onceki) return onceki;
      const satirlar = [...onceki.satirlar];
      const yeniDeger = alan.endsWith('_price')
        ? value.replace(/\s/g, '').replace(',', '.') || null
        : value || null;
      satirlar[index] = { ...satirlar[index], [alan]: yeniDeger };
      return { ...onceki, satirlar, hatalar: aktarimSatirlariniDogrula(satirlar) };
    });
  }

  async function aktarimiBaslat() {
    if (!aktarimDosyasi || !seciliYayin) return;
    if (aktarimDosyasi.hatalar.length > 0) {
      setDosyaHatasi('Aktarımdan önce doğrulama hatalarını dosyada düzeltin ve yeniden yükleyin.');
      return;
    }
    const yayin = yayinlar.find((item) => item.id === seciliYayin);
    const belgeUrl = yayin?.dogrudan_belge_url;
    if (!belgeUrl) {
      setDosyaHatasi('Seçilen yayında doğrudan resmî belge URL’si bulunmuyor.');
      return;
    }

    setAktariliyor(true);
    setAktarimYuzdesi(0);
    setDosyaHatasi(null);
    const baslangic = await supabase.rpc('admin_poz_aktarimini_baslat', {
      p_yayin_id: seciliYayin,
      p_fasikul_id: seciliFasikul || null,
      p_belge_url: belgeUrl,
      p_dosya_adi: aktarimDosyasi.dosyaAdi,
      p_kaynak_bicimi: aktarimDosyasi.bicim,
    });
    if (baslangic.error) {
      setAktariliyor(false);
      setDosyaHatasi(baslangic.error.message);
      return;
    }
    const aktarimId = (baslangic.data as { aktarim_id: string }).aktarim_id;
    const satirlar = aktarimDosyasi.satirlar;
    try {
      for (let index = 0; index < satirlar.length; index += 500) {
        const parca = satirlar.slice(index, index + 500);
        const { error } = await supabase.rpc('admin_poz_aktarim_satirlarini_ekle', {
          p_aktarim_id: aktarimId,
          p_satirlar: parca,
        });
        if (error) throw error;
        setAktarimYuzdesi(
          Math.round((Math.min(index + parca.length, satirlar.length) / satirlar.length) * 100),
        );
      }
      const { error } = await supabase.rpc('admin_poz_aktarimini_tamamla', {
        p_aktarim_id: aktarimId,
      });
      if (error) throw error;
      toast.success(`${satirlar.length.toLocaleString('tr-TR')} poz başarıyla aktarıldı.`);
      setAktarimDosyasi(null);
      await verileriYukle();
    } catch (error) {
      await supabase.rpc('admin_poz_aktarimini_iptal_et', {
        p_aktarim_id: aktarimId,
        p_gerekce: error instanceof Error ? error.message : String(error),
      });
      setDosyaHatasi(
        `Aktarım durduruldu ve eklenen parçalar temizlendi: ${error instanceof Error ? error.message : String(error)}.`,
      );
    } finally {
      setAktariliyor(false);
    }
  }

  async function aktarimiIptalEt(aktarimId: string) {
    const { error } = await supabase.rpc('admin_poz_aktarimini_iptal_et', {
      p_aktarim_id: aktarimId,
      p_gerekce: 'Admin panelinden temizlendi',
    });
    if (error) toast.error(error.message);
    else toast.success('Tamamlanmamış aktarım temizlendi.');
    await verileriYukle();
  }

  async function donemKaydet(donem: PaketDonemi) {
    const { error } = await supabase
      .from('paket_donemleri')
      .update({ fiyat: donem.fiyat, aktif_mi: donem.aktif_mi })
      .eq('id', donem.id);
    if (error) toast.error(error.message);
    else toast.success('Paket dönemi güncellendi.');
    await verileriYukle();
  }

  async function ozellikDegistir(paketId: string, ozellikKodu: string, secili: boolean) {
    const sonuc = secili
      ? await supabase
          .from('paket_ozellikleri')
          .insert({ paket_id: paketId, ozellik_kodu: ozellikKodu })
      : await supabase
          .from('paket_ozellikleri')
          .delete()
          .eq('paket_id', paketId)
          .eq('ozellik_kodu', ozellikKodu);
    if (sonuc.error) toast.error(sonuc.error.message);
    await verileriYukle();
  }

  async function bankaKaydet(event: React.FormEvent) {
    event.preventDefault();
    const { error } = await supabase.from('banka_hesaplari').insert({
      ...bankaFormu,
      iban: bankaFormu.iban.replace(/\s/g, '').toLocaleUpperCase('tr-TR'),
      aciklama: bankaFormu.aciklama || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Banka hesabı eklendi.');
      setBankaFormu({ banka_adi: '', alici_adi: '', iban: '', aciklama: '' });
    }
    await verileriYukle();
  }

  async function odemeKarari(odemeId: string, karar: 'onayla' | 'reddet') {
    const not = odemeNotlari[odemeId] ?? '';
    if (karar === 'reddet' && !not.trim()) {
      toast.error('Reddetme gerekçesi zorunludur.');
      return;
    }
    const { error } = await supabase.rpc(
      karar === 'onayla' ? 'admin_odeme_onayla' : 'admin_odeme_reddet',
      karar === 'onayla'
        ? { p_odeme_id: odemeId, p_admin_notu: not || null }
        : { p_odeme_id: odemeId, p_admin_notu: not },
    );
    if (error) toast.error(error.message);
    else
      toast.success(
        karar === 'onayla' ? 'Ödeme onaylandı ve üyelik başlatıldı.' : 'Ödeme reddedildi.',
      );
    await verileriYukle();
  }

  if (yukleniyor) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-muted-foreground text-sm">Admin verileri yükleniyor…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="bg-muted/20 w-56 shrink-0 border-r p-3">
        <div className="mb-4 px-2">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="text-primary size-4" />
            Yönetim Merkezi
          </div>
          <p className="text-muted-foreground mt-1 text-xs">Veri, üyelik ve ödeme işlemleri</p>
        </div>
        <nav className="space-y-1" aria-label="Admin bölümleri">
          {SEKME_LISTESI.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSekme(item.id)}
                className={cn(
                  'flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-md px-3 text-left text-sm transition-colors',
                  sekme === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.ad}
                {item.id === 'odemeler' && odemeler.some((odeme) => odeme.durum === 'bekliyor') && (
                  <Badge variant="secondary" className="ml-auto">
                    {odemeler.filter((odeme) => odeme.durum === 'bekliyor').length}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto p-5">
        {sekme === 'genel' && (
          <div className="mx-auto max-w-5xl space-y-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Admin kurulum rehberi</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Sıralamayı izleyin. Üyelik özellikleri siz açana kadar hiçbir pakete verilmez.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Card className="gap-2 py-4">
                <CardContent className="px-4">
                  <Database className="text-primary size-5" />
                  <div className="mt-3 text-2xl font-semibold">{yayinlar.length}</div>
                  <p className="text-muted-foreground text-xs">Yayın</p>
                </CardContent>
              </Card>
              <Card className="gap-2 py-4">
                <CardContent className="px-4">
                  <Users className="text-primary size-5" />
                  <div className="mt-3 text-2xl font-semibold">3</div>
                  <p className="text-muted-foreground text-xs">Üyelik paketi</p>
                </CardContent>
              </Card>
              <Card className="gap-2 py-4">
                <CardContent className="px-4">
                  <Settings2 className="text-primary size-5" />
                  <div className="mt-3 text-2xl font-semibold">{paketOzellikleri.length}</div>
                  <p className="text-muted-foreground text-xs">Açık paket özelliği</p>
                </CardContent>
              </Card>
              <Card className="gap-2 py-4">
                <CardContent className="px-4">
                  <Landmark className="text-primary size-5" />
                  <div className="mt-3 text-2xl font-semibold">
                    {bankaHesaplari.filter((h) => h.aktif_mi).length}
                  </div>
                  <p className="text-muted-foreground text-xs">Aktif IBAN</p>
                </CardContent>
              </Card>
              <Card className="gap-2 py-4">
                <CardContent className="px-4">
                  <CircleDollarSign className="text-primary size-5" />
                  <div className="mt-3 text-2xl font-semibold">
                    {odemeler.filter((o) => o.durum === 'bekliyor').length}
                  </div>
                  <p className="text-muted-foreground text-xs">Bekleyen ödeme</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>İlk kurulum kontrol listesi</CardTitle>
                <CardDescription>
                  Her adımın neden gerekli olduğu yanında açıklanır.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {kurulum.map((adim, index) => (
                  <div key={adim.ad} className="flex items-start gap-3 rounded-lg border p-3">
                    <div
                      className={cn(
                        'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                        adim.tamam
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {adim.tamam ? <Check className="size-4" /> : index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{adim.ad}</p>
                      <p className="text-muted-foreground text-xs">{adim.aciklama}</p>
                    </div>
                    <Badge variant={adim.tamam ? 'secondary' : 'outline'} className="ml-auto">
                      {adim.tamam ? 'Hazır' : 'Bekliyor'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {sekme === 'kaynaklar' && (
          <div className="mx-auto max-w-5xl space-y-5">
            <div>
              <h1 className="text-2xl font-semibold">Kaynak ve yayın oluştur</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Her poz mutlaka resmî kurum, kitap, dönem ve kaynak URL’sine bağlanır.
              </p>
            </div>
            <form onSubmit={kaynakKaydet} className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="size-4" />
                    1. Kurum ve katalog
                  </CardTitle>
                  <CardDescription>
                    Veriyi yayımlayan kamu kurumu ve resmî liste sayfası.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormAlani
                    id="kurum-kodu"
                    etiket="Kurum kodu"
                    value={kaynakFormu.kurum_kodu}
                    onChange={(v) => setKaynakFormu((f) => ({ ...f, kurum_kodu: v }))}
                    required
                  />
                  <FormAlani
                    id="kurum-adi"
                    etiket="Kurum adı"
                    value={kaynakFormu.kurum_adi}
                    onChange={(v) => setKaynakFormu((f) => ({ ...f, kurum_adi: v }))}
                    required
                  />
                  <FormAlani
                    id="kurum-url"
                    etiket="Kurum resmî URL"
                    type="url"
                    value={kaynakFormu.kurum_url}
                    onChange={(v) => setKaynakFormu((f) => ({ ...f, kurum_url: v }))}
                  />
                  <FormAlani
                    id="katalog-anahtari"
                    etiket="Katalog anahtarı"
                    aciklama="Yıllar boyunca aynı kaynak serisini tanımlayan kısa kod."
                    value={kaynakFormu.katalog_anahtari}
                    onChange={(v) => setKaynakFormu((f) => ({ ...f, katalog_anahtari: v }))}
                    required
                  />
                  <FormAlani
                    id="katalog-adi"
                    etiket="Katalog adı"
                    value={kaynakFormu.katalog_adi}
                    onChange={(v) => setKaynakFormu((f) => ({ ...f, katalog_adi: v }))}
                    required
                  />
                  <FormAlani
                    id="kaynak-url"
                    etiket="Resmî kaynak sayfası"
                    type="url"
                    value={kaynakFormu.kaynak_sayfasi_url}
                    onChange={(v) => setKaynakFormu((f) => ({ ...f, kaynak_sayfasi_url: v }))}
                    required
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="size-4" />
                    2. Kitap ve fasikül
                  </CardTitle>
                  <CardDescription>
                    Pozun ait olduğu sürekli kitap ailesi ve isteğe bağlı bölümü.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormAlani
                    id="kitap-anahtari"
                    etiket="Kitap anahtarı"
                    value={kaynakFormu.kitap_anahtari}
                    onChange={(v) => setKaynakFormu((f) => ({ ...f, kitap_anahtari: v }))}
                    required
                  />
                  <FormAlani
                    id="kitap-adi"
                    etiket="Kitap adı"
                    value={kaynakFormu.kitap_adi}
                    onChange={(v) => setKaynakFormu((f) => ({ ...f, kitap_adi: v }))}
                    required
                  />
                  <FormAlani
                    id="disiplin"
                    etiket="Disiplin"
                    aciklama="Örn. inşaat, mekanik, elektrik."
                    value={kaynakFormu.disiplin}
                    onChange={(v) => setKaynakFormu((f) => ({ ...f, disiplin: v }))}
                  />
                  <FormAlani
                    id="fasikul"
                    etiket="Fasikül / bölüm"
                    value={kaynakFormu.fasikul_adi}
                    onChange={(v) => setKaynakFormu((f) => ({ ...f, fasikul_adi: v }))}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>3. Yayın dönemi</CardTitle>
                  <CardDescription>
                    Her ay/yıl/revizyon ayrı yayın olur; böylece fiyat geçmişi korunur.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <FormAlani
                      id="yayin-basligi"
                      etiket="Yayın başlığı"
                      value={kaynakFormu.yayin_basligi}
                      onChange={(v) => setKaynakFormu((f) => ({ ...f, yayin_basligi: v }))}
                      required
                    />
                  </div>
                  <FormAlani
                    id="donem"
                    etiket="Dönem etiketi"
                    aciklama="Örn. 2026 Ağustos."
                    value={kaynakFormu.donem_etiketi}
                    onChange={(v) => setKaynakFormu((f) => ({ ...f, donem_etiketi: v }))}
                    required
                  />
                  <FormAlani
                    id="yil"
                    etiket="Yıl"
                    type="number"
                    value={kaynakFormu.yil}
                    onChange={(v) => setKaynakFormu((f) => ({ ...f, yil: v }))}
                    required
                  />
                  <FormAlani
                    id="ay"
                    etiket="Ay (1-12)"
                    type="number"
                    value={kaynakFormu.ay}
                    onChange={(v) => setKaynakFormu((f) => ({ ...f, ay: v }))}
                  />
                  <FormAlani
                    id="revizyon"
                    etiket="Revizyon"
                    type="number"
                    value={kaynakFormu.revizyon}
                    onChange={(v) => setKaynakFormu((f) => ({ ...f, revizyon: v }))}
                  />
                  <div className="md:col-span-2 lg:col-span-3">
                    <FormAlani
                      id="belge-url"
                      etiket="Doğrudan resmî belge URL’si"
                      type="url"
                      aciklama="PDF, Excel veya verinin doğrulanabileceği resmî dosya bağlantısı."
                      value={kaynakFormu.belge_url}
                      onChange={(v) => setKaynakFormu((f) => ({ ...f, belge_url: v }))}
                      required
                    />
                  </div>
                </CardContent>
              </Card>
              <div className="flex justify-end">
                <Button type="submit" disabled={kaynakKaydediliyor}>
                  {kaynakKaydediliyor && <Loader2 className="animate-spin" />}Kaynağı kaydet ve
                  aktarıma geç
                </Button>
              </div>
            </form>
          </div>
        )}

        {sekme === 'aktarim' && (
          <div className="mx-auto max-w-6xl space-y-5">
            <div>
              <h1 className="text-2xl font-semibold">Toplu poz aktarımı</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                JSON, CSV veya Excel’i doğrulayın; en fazla 500 satırlık güvenli parçalar halinde
                veritabanına aktarılır.
              </p>
            </div>
            {aktarimlar.length > 0 && (
              <Card className="border-amber-500/40">
                <CardHeader>
                  <CardTitle className="text-base">Tamamlanmamış aktarımlar</CardTitle>
                  <CardDescription>
                    Yarım kalan satırlar üyelere gösterilmez. Yeniden denemeden önce temizleyin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {aktarimlar.map((aktarim) => (
                    <div
                      key={aktarim.id}
                      className="flex flex-wrap items-center gap-3 rounded-md border p-3"
                    >
                      <CircleAlert className="size-4 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium">
                          {aktarim.yayinlar?.baslik ?? 'Bilinmeyen yayın'} ·{' '}
                          {aktarim.yayinlar?.donem_etiketi_ham}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {aktarim.islenen_surum_sayisi} satır · {aktarim.durum}
                        </p>
                      </div>
                      <Button
                        className="ml-auto"
                        size="sm"
                        variant="destructive"
                        onClick={() => void aktarimiIptalEt(aktarim.id)}
                      >
                        <X />
                        Temizle
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>1. Yayın ve dosya</CardTitle>
                <CardDescription>
                  Aynı poz kodu aynı yayına ikinci kez eklenemez. Yeni fiyat dönemi için yeni yayın
                  oluşturun.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="yayin-sec">Hedef yayın</Label>
                  <select
                    id="yayin-sec"
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                    value={seciliYayin}
                    onChange={(e) => {
                      setSeciliYayin(e.target.value);
                      setSeciliFasikul('');
                    }}
                  >
                    <option value="">Yayın seçin</option>
                    {yayinlar.map((yayin) => (
                      <option key={yayin.id} value={yayin.id}>
                        {yayin.kurumlar?.ad} — {yayin.baslik} ({yayin.donem_etiketi_ham})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fasikul-sec">Fasikül / bölüm</Label>
                  <select
                    id="fasikul-sec"
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                    value={seciliFasikul}
                    onChange={(e) => setSeciliFasikul(e.target.value)}
                    disabled={!seciliYayin}
                  >
                    <option value="">Fasikül seçilmedi</option>
                    {fasikuller
                      .filter(
                        (fasikul) =>
                          fasikul.kitap_ailesi_id ===
                          yayinlar.find((yayin) => yayin.id === seciliYayin)?.kitap_ailesi_id,
                      )
                      .map((fasikul) => (
                        <option key={fasikul.id} value={fasikul.id}>
                          {fasikul.ad_ham}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="poz-dosyasi">Poz dosyası</Label>
                  <Input
                    id="poz-dosyasi"
                    type="file"
                    accept=".json,.csv,.xlsx,.xls"
                    onChange={(e) => void dosyaSec(e.target.files?.[0] ?? null)}
                    disabled={aktariliyor}
                  />
                  <p className="text-muted-foreground text-xs">
                    Gerekli kolonlar: POZ, DESCRIPTION ve en az bir fiyat alanı.
                  </p>
                </div>
              </CardContent>
            </Card>
            {dosyaHatasi && (
              <div
                role="alert"
                tabIndex={-1}
                className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border p-3 text-sm"
              >
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                {dosyaHatasi}
              </div>
            )}
            {aktarimDosyasi && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>2. Önizleme ve doğrulama</span>
                    <Badge variant={aktarimDosyasi.hatalar.length ? 'destructive' : 'secondary'}>
                      {aktarimDosyasi.satirlar.length.toLocaleString('tr-TR')} satır ·{' '}
                      {aktarimDosyasi.hatalar.length} hata
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    İlk 50 satır burada düzeltilebilir. Büyük değişikliklerde kaynak dosyayı
                    düzeltip yeniden yükleyin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aktarimDosyasi.hatalar.length > 0 && (
                    <div className="bg-muted/40 max-h-36 overflow-auto rounded-md border p-3 text-sm">
                      <p className="mb-2 font-medium">Doğrulama hataları</p>
                      {aktarimDosyasi.hatalar.slice(0, 50).map((hata) => (
                        <p key={`${hata.satir}-${hata.alan}`}>
                          Satır {hata.satir} · {hata.alan}: {hata.mesaj}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="max-h-[420px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-36">Poz</TableHead>
                          <TableHead>Tanım</TableHead>
                          <TableHead className="w-24">Birim</TableHead>
                          <TableHead className="w-32">Birim fiyat</TableHead>
                          <TableHead className="w-24">Sayfa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aktarimDosyasi.satirlar.slice(0, 50).map((satir, index) => (
                          <TableRow key={`${satir.poz}-${index}`}>
                            <TableCell>
                              <Input
                                className="h-8 font-mono text-xs"
                                value={satir.poz}
                                onChange={(e) => satirGuncelle(index, 'poz', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-8 min-w-72 text-xs"
                                value={satir.description}
                                onChange={(e) =>
                                  satirGuncelle(index, 'description', e.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-8 text-xs"
                                value={satir.unit ?? ''}
                                onChange={(e) => satirGuncelle(index, 'unit', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-8 text-right font-mono text-xs"
                                value={satir.unit_price ?? ''}
                                onChange={(e) => satirGuncelle(index, 'unit_price', e.target.value)}
                              />
                            </TableCell>
                            <TableCell className="text-center text-xs">{satir.page}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {aktarimYuzdesi !== null && (
                    <div className="space-y-1">
                      <div className="bg-muted h-2 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full transition-[width]"
                          style={{ width: `${aktarimYuzdesi}%` }}
                        />
                      </div>
                      <p className="text-muted-foreground text-right text-xs">%{aktarimYuzdesi}</p>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button
                      onClick={() => void aktarimiBaslat()}
                      disabled={aktariliyor || !seciliYayin || aktarimDosyasi.hatalar.length > 0}
                    >
                      {aktariliyor ? <Loader2 className="animate-spin" /> : <Upload />}Doğrulanmış
                      satırları aktar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {sekme === 'paketler' && (
          <div className="mx-auto max-w-6xl space-y-5">
            <div>
              <h1 className="text-2xl font-semibold">Paket, özellik ve IBAN</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Önce fiyatları ve IBAN’ı kaydedin; sonra paketlere veri özelliklerini bilinçli
                olarak açın.
              </p>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              {paketler.map((paket) => (
                <Card key={paket.id}>
                  <CardHeader>
                    <CardTitle>{paket.ad}</CardTitle>
                    <CardDescription>{paket.aciklama}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {paket.paket_donemleri.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        Ücretsiz paket için fiyat dönemi gerekmez.
                      </p>
                    ) : (
                      paket.paket_donemleri.map((donem) => (
                        <div key={donem.id} className="rounded-md border p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium capitalize">{donem.donem}</span>
                            <label className="flex cursor-pointer items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={donem.aktif_mi}
                                onChange={(e) =>
                                  setPaketler((liste) =>
                                    liste.map((p) =>
                                      p.id === paket.id
                                        ? {
                                            ...p,
                                            paket_donemleri: p.paket_donemleri.map((d) =>
                                              d.id === donem.id
                                                ? { ...d, aktif_mi: e.target.checked }
                                                : d,
                                            ),
                                          }
                                        : p,
                                    ),
                                  )
                                }
                              />
                              Satışta
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Fiyat"
                              value={donem.fiyat ?? ''}
                              onChange={(e) =>
                                setPaketler((liste) =>
                                  liste.map((p) =>
                                    p.id === paket.id
                                      ? {
                                          ...p,
                                          paket_donemleri: p.paket_donemleri.map((d) =>
                                            d.id === donem.id
                                              ? {
                                                  ...d,
                                                  fiyat:
                                                    e.target.value === ''
                                                      ? null
                                                      : Number(e.target.value),
                                                }
                                              : d,
                                          ),
                                        }
                                      : p,
                                  ),
                                )
                              }
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void donemKaydet(donem)}
                            >
                              Kaydet
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                    <div className="space-y-2 border-t pt-4">
                      <p className="text-sm font-medium">Açık özellikler</p>
                      {ozellikler.map((ozellik) => {
                        const secili = paketOzellikleri.some(
                          (po) => po.paket_id === paket.id && po.ozellik_kodu === ozellik.kod,
                        );
                        return (
                          <label
                            key={ozellik.kod}
                            className="hover:bg-muted flex cursor-pointer items-start gap-2 rounded-md p-2"
                          >
                            <input
                              className="mt-1"
                              type="checkbox"
                              checked={secili}
                              onChange={(e) =>
                                void ozellikDegistir(paket.id, ozellik.kod, e.target.checked)
                              }
                            />
                            <span>
                              <span className="block text-sm">{ozellik.ad}</span>
                              <span className="text-muted-foreground block text-xs">
                                {ozellik.aciklama}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="size-4" />
                  Banka hesapları
                </CardTitle>
                <CardDescription>
                  Dekontla ödeme yapacak kullanıcılar yalnız aktif hesapları görür.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={bankaKaydet} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <Input
                    placeholder="Banka adı"
                    value={bankaFormu.banka_adi}
                    onChange={(e) => setBankaFormu((f) => ({ ...f, banka_adi: e.target.value }))}
                    required
                  />
                  <Input
                    placeholder="Alıcı adı"
                    value={bankaFormu.alici_adi}
                    onChange={(e) => setBankaFormu((f) => ({ ...f, alici_adi: e.target.value }))}
                    required
                  />
                  <Input
                    className="xl:col-span-2"
                    placeholder="TR00 0000…"
                    value={bankaFormu.iban}
                    onChange={(e) => setBankaFormu((f) => ({ ...f, iban: e.target.value }))}
                    required
                  />
                  <Button type="submit">IBAN ekle</Button>
                </form>
                {bankaHesaplari.map((hesap) => (
                  <div
                    key={hesap.id}
                    className="flex flex-wrap items-center gap-3 rounded-md border p-3"
                  >
                    <Landmark className="text-muted-foreground size-4" />
                    <div>
                      <p className="text-sm font-medium">
                        {hesap.banka_adi} · {hesap.alici_adi}
                      </p>
                      <p className="font-mono text-xs">{hesap.iban}</p>
                    </div>
                    <Badge className="ml-auto" variant={hesap.aktif_mi ? 'secondary' : 'outline'}>
                      {hesap.aktif_mi ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {sekme === 'odemeler' && (
          <div className="mx-auto max-w-6xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Ödeme onayları</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Dekontu banka hareketiyle karşılaştırın; onay üyeliği otomatik başlatır.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void verileriYukle()}>
                <RefreshCw />
                Yenile
              </Button>
            </div>
            <Card>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kullanıcı</TableHead>
                      <TableHead>Paket</TableHead>
                      <TableHead>Tutar</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="w-80">İnceleme</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {odemeler.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                          Henüz ödeme bildirimi yok.
                        </TableCell>
                      </TableRow>
                    ) : (
                      odemeler.map((odeme) => (
                        <TableRow key={odeme.id}>
                          <TableCell>
                            <p className="text-sm font-medium">
                              {odeme.kullanici_profilleri?.ad_soyad ||
                                odeme.kullanici_profilleri?.eposta ||
                                odeme.kullanici_id}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {odeme.kullanici_profilleri?.eposta}
                            </p>
                          </TableCell>
                          <TableCell>
                            {odeme.paket_donemleri?.uyelik_paketleri?.ad} ·{' '}
                            {odeme.paket_donemleri?.donem}
                          </TableCell>
                          <TableCell className="font-mono">
                            {Number(odeme.tutar).toLocaleString('tr-TR', {
                              minimumFractionDigits: 2,
                            })}{' '}
                            {odeme.para_birimi}
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(odeme.olusturulma_zamani).toLocaleString('tr-TR')}
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>
                            {odeme.durum === 'bekliyor' ? (
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={async () => {
                                      const { data } = await supabase.storage
                                        .from('odeme-dekontlari')
                                        .createSignedUrl(odeme.dekont_yolu, 120);
                                      if (data?.signedUrl)
                                        window.open(
                                          data.signedUrl,
                                          '_blank',
                                          'noopener,noreferrer',
                                        );
                                    }}
                                  >
                                    <FileSpreadsheet />
                                    Dekont
                                  </Button>
                                </div>
                                <Input
                                  className="h-8"
                                  placeholder="Onay notu / red gerekçesi"
                                  value={odemeNotlari[odeme.id] ?? ''}
                                  onChange={(e) =>
                                    setOdemeNotlari((n) => ({ ...n, [odeme.id]: e.target.value }))
                                  }
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="xs"
                                    onClick={() => void odemeKarari(odeme.id, 'onayla')}
                                  >
                                    <BadgeCheck />
                                    Onayla
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="destructive"
                                    onClick={() => void odemeKarari(odeme.id, 'reddet')}
                                  >
                                    <X />
                                    Reddet
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-xs">
                                {odeme.admin_notu || 'İşlem tamamlandı.'}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
