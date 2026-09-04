import 'server-only';

import { createClient } from '@shared/lib/supabase/server';
import { adminOturumunuDogrula } from '@features/auth/dal';
import type {
  AdminBolumVerisi,
  BelgeProfili,
  AdminGorev,
  AdminOzet,
  AktarimCalismasi,
  AktarimDetayi,
  GorselDogrulamaKumesi,
  GorselDogrulamaOzeti,
  GorselDogrulamaSatiri,
  GorselDogrulamaVerisi,
  IncelemeKaydi,
  PozDetayi,
  PozFiltresi,
  PozFiltreSecenekleri,
  PozGezginiSonucu,
  PozIncelemeDetayi,
  PozIncelemeKomsulari,
  TicaretVerisi,
  WorkerDurumu,
  YonetimPaketi,
} from '@features/admin/types';

const BOS_OZET: AdminOzet = {
  worker: { cevrimici: 0, toplam: 0, son_kalp_atisi: null },
  gorevler: {},
  inceleme_bekleyen: 0,
  gorev_toplami: 0,
  aktif_gorev_sayisi: 0,
  tamamlanan_gorev_sayisi: 0,
  basarisiz_gorev_sayisi: 0,
  gorev_basari_orani: 0,
  poz_sayisi: 0,
  poz_surumu_sayisi: 0,
  fiyat_sayisi: 0,
  yayin_sayisi: 0,
  kurum_sayisi: 0,
  belge_sayisi: 0,
  sayfa_sayisi: 0,
  profil_sayisi: 0,
  aktarim_sayisi: 0,
  bekleyen_odeme: 0,
};

async function rpc<T>(
  ad: string,
  parametreler: Record<string, unknown> = {},
  zamanAsimiMs?: number,
): Promise<T> {
  const supabase = await createClient();
  if (!zamanAsimiMs) {
    const { data, error } = await supabase.rpc(ad, parametreler);
    if (error) throw new Error(error.message);
    return data as T;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), zamanAsimiMs);
  try {
    const { data, error } = await supabase.rpc(ad, parametreler).abortSignal(controller.signal);
    if (error) throw new Error(error.message);
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

function altyapiUyarisi(error: unknown) {
  const mesaj = error instanceof Error ? error.message : String(error);
  if (/statement timeout|canceling statement/i.test(mesaj)) {
    return `Yönetim verisi sorgusu zaman aşımına uğradı. Filtreleri daraltıp yeniden deneyin: ${mesaj}`;
  }
  return `Yönetim merkezi migration'ı henüz uygulanmamış veya erişim reddedilmiş: ${mesaj}`;
}

export async function yonetimOzetiniGetir(): Promise<AdminBolumVerisi<AdminOzet>> {
  try {
    const data = await rpc<Partial<AdminOzet>>('admin_yonetim_ozeti');
    return {
      data: {
        ...BOS_OZET,
        ...data,
        worker: { ...BOS_OZET.worker, ...data.worker },
        gorevler: data.gorevler ?? {},
      },
      hazir: true,
    };
  } catch (error) {
    return {
      data: BOS_OZET,
      hazir: false,
      uyari: altyapiUyarisi(error),
    };
  }
}

export async function gorevleriGetir(): Promise<AdminBolumVerisi<AdminGorev[]>> {
  try {
    const data = await rpc<AdminGorev[]>('admin_gorevleri_listele', {
      p_durum: null,
      p_tur: null,
      p_limit: 200,
      p_cursor: null,
    });
    return { data, hazir: true };
  } catch (error) {
    return { data: [], hazir: false, uyari: altyapiUyarisi(error) };
  }
}

export async function workerlariGetir(): Promise<AdminBolumVerisi<WorkerDurumu[]>> {
  try {
    return { data: await rpc<WorkerDurumu[]>('admin_workerlari_listele'), hazir: true };
  } catch (error) {
    return { data: [], hazir: false, uyari: altyapiUyarisi(error) };
  }
}

export async function incelemeleriGetir(): Promise<AdminBolumVerisi<IncelemeKaydi[]>> {
  try {
    return {
      data: await rpc<IncelemeKaydi[]>('admin_incelemeleri_listele', {
        p_durum: 'inceleme_bekliyor',
        p_tur: null,
        p_limit: 200,
      }),
      hazir: true,
    };
  } catch (error) {
    return { data: [], hazir: false, uyari: altyapiUyarisi(error) };
  }
}

export async function pozlariGetir(
  filtre: PozFiltresi,
): Promise<AdminBolumVerisi<PozGezginiSonucu>> {
  const bos: PozGezginiSonucu = {
    kayitlar: [],
    toplam: 0,
    limit: filtre.limit,
    offset: filtre.offset,
  };
  if (!filtre.kurumId && !filtre.yayinId) return { data: bos, hazir: true };
  try {
    return {
      data: await rpc<PozGezginiSonucu>('admin_poz_gezgini', {
        p_arama: filtre.arama,
        p_kurum_id: filtre.kurumId,
        p_yayin_id: filtre.yayinId,
        p_kayit_turu: filtre.kayitTuru,
        p_birim_kodu: filtre.birimKodu,
        p_basliklari_goster: filtre.basliklariGoster,
        p_limit: filtre.limit,
        p_offset: filtre.offset,
      }),
      hazir: true,
    };
  } catch (error) {
    return { data: bos, hazir: false, uyari: altyapiUyarisi(error) };
  }
}

export async function pozDetayiniGetir(
  pozSurumuId?: string,
): Promise<AdminBolumVerisi<PozDetayi | null>> {
  if (!pozSurumuId) return { data: null, hazir: true };
  try {
    return {
      data: await rpc<PozDetayi>('admin_poz_detayi', { p_poz_surumu_id: pozSurumuId }),
      hazir: true,
    };
  } catch (error) {
    return { data: null, hazir: false, uyari: altyapiUyarisi(error) };
  }
}

export async function pozIncelemeDetayiniGetir(
  pozSurumuId: string,
): Promise<AdminBolumVerisi<PozIncelemeDetayi | null>> {
  try {
    return {
      data: await rpc<PozIncelemeDetayi>('admin_poz_inceleme_detayi', {
        p_poz_surumu_id: pozSurumuId,
      }),
      hazir: true,
    };
  } catch (error) {
    return { data: null, hazir: false, uyari: altyapiUyarisi(error) };
  }
}

export async function pozIncelemeKomsulariniGetir(
  pozSurumuId: string,
  filtre: PozFiltresi,
): Promise<AdminBolumVerisi<PozIncelemeKomsulari>> {
  const bos: PozIncelemeKomsulari = {
    onceki_poz_surumu_id: null,
    sonraki_poz_surumu_id: null,
    sira: 0,
    toplam: 0,
  };
  if (!filtre.kurumId && !filtre.yayinId) {
    return {
      data: bos,
      hazir: false,
      uyari: 'İnceleme sırası için kurum veya yayın seçilmelidir.',
    };
  }
  try {
    return {
      data: await rpc<PozIncelemeKomsulari>('admin_poz_inceleme_komsulari', {
        p_poz_surumu_id: pozSurumuId,
        p_arama: filtre.arama,
        p_kurum_id: filtre.kurumId,
        p_yayin_id: filtre.yayinId,
        p_kayit_turu: filtre.kayitTuru,
        p_birim_kodu: filtre.birimKodu,
        p_basliklari_goster: filtre.basliklariGoster,
      }),
      hazir: true,
    };
  } catch (error) {
    return { data: bos, hazir: false, uyari: altyapiUyarisi(error) };
  }
}

export async function pozFiltreSecenekleriniGetir(): Promise<PozFiltreSecenekleri> {
  const supabase = await createClient();
  const [kurumlar, yayinlar, birimler] = await Promise.all([
    supabase.from('kurumlar').select('id, ad').order('ad'),
    supabase.from('yayinlar').select('id, baslik, kurum_id').order('donem_sirasi', {
      ascending: false,
    }),
    supabase.from('birim_sozlugu').select('birim_kodu, gorunen_ad').order('birim_kodu'),
  ]);
  const birimHaritasi = new Map<string, string>();
  for (const birim of birimler.data ?? []) {
    if (!birimHaritasi.has(birim.birim_kodu)) {
      birimHaritasi.set(birim.birim_kodu, birim.gorunen_ad);
    }
  }
  return {
    kurumlar: (kurumlar.data ?? []) as PozFiltreSecenekleri['kurumlar'],
    yayinlar: (yayinlar.data ?? []) as PozFiltreSecenekleri['yayinlar'],
    birimler: Array.from(birimHaritasi, ([kod, ad]) => ({ kod, ad })),
  };
}

async function aktarimListesi(): Promise<AktarimCalismasi[]> {
  await adminOturumunuDogrula();
  return rpc<AktarimCalismasi[]>('admin_aktarimlari_listele', { p_limit: 200 });
}

export async function aktarimlariGetir(
  aktarimId?: string,
): Promise<AdminBolumVerisi<{ aktarimlar: AktarimCalismasi[]; detay: AktarimDetayi | null }>> {
  try {
    const aktarimlar = await aktarimListesi();
    const secili = aktarimlar.find((row) => row.id === aktarimId) ?? aktarimlar[0] ?? null;
    if (!secili) return { data: { aktarimlar, detay: null }, hazir: true };

    const [ozet, normalize, tutarlilik, sayfaRaporu, hataRaporu, hamSatirOrnekleri] =
      await Promise.allSettled([
        rpc<Record<string, unknown>>('admin_aktarim_ozeti', { p_aktarim_id: secili.id }, 8_000),
        rpc<Record<string, unknown>>('admin_normalize_ozeti', { p_aktarim_id: secili.id }, 8_000),
        rpc<Record<string, unknown>>(
          'admin_aktarim_tutarlilik',
          { p_aktarim_id: secili.id },
          4_000,
        ),
        rpc<Record<string, unknown>>(
          'admin_aktarim_sayfa_raporu',
          { p_aktarim_id: secili.id, p_yalnizca_sorunlu: true, p_limit: 200 },
          6_000,
        ),
        rpc<Record<string, unknown>>(
          'admin_aktarim_hata_raporu',
          { p_aktarim_id: secili.id, p_limit: 100 },
          6_000,
        ),
        rpc<Record<string, unknown>>(
          'admin_ham_satir_ornekleri',
          { p_aktarim_id: secili.id, p_sayfa_no: null, p_limit: 20 },
          6_000,
        ),
      ]);
    const deger = (sonuc: PromiseSettledResult<Record<string, unknown>>) =>
      sonuc.status === 'fulfilled' ? sonuc.value : null;
    return {
      data: {
        aktarimlar,
        detay: {
          aktarim: secili,
          ozet: deger(ozet),
          normalize: deger(normalize),
          tutarlilik: deger(tutarlilik),
          sayfaRaporu: deger(sayfaRaporu),
          hataRaporu: deger(hataRaporu),
          hamSatirOrnekleri: deger(hamSatirOrnekleri),
          tutarlilikUyarisi:
            tutarlilik.status === 'rejected'
              ? 'Tutarlılık özeti süre sınırını aştı veya alınamadı. Koşu verileri korunuyor; daha sonra yeniden deneyin.'
              : undefined,
        },
      },
      hazir: true,
    };
  } catch (error) {
    return {
      data: { aktarimlar: [], detay: null },
      hazir: false,
      uyari: altyapiUyarisi(error),
    };
  }
}

function kumeSayfalari(
  kume: GorselDogrulamaKumesi,
  dogrulananSayfalar: number[],
  istenen?: number,
) {
  if (istenen && istenen >= kume.ilk_sayfa && istenen <= kume.son_sayfa) return [istenen];
  const araliktakiSayfalar = dogrulananSayfalar.filter(
    (sayfa) => sayfa >= kume.ilk_sayfa && sayfa <= kume.son_sayfa,
  );
  if (!araliktakiSayfalar.length) return [kume.ilk_sayfa];
  const orta = araliktakiSayfalar[Math.floor(araliktakiSayfalar.length / 2)];
  return Array.from(new Set([araliktakiSayfalar[0], orta, araliktakiSayfalar.at(-1) as number]));
}

function gorselSatirlari(value: unknown, alan: 'adaylar' | 'satirlar') {
  if (!value || typeof value !== 'object') return [];
  const satirlar = (value as Record<string, unknown>)[alan];
  if (!Array.isArray(satirlar)) return [];
  return satirlar.flatMap((satir): GorselDogrulamaSatiri[] => {
    if (!satir || typeof satir !== 'object') return [];
    const row = satir as Record<string, unknown>;
    if (
      typeof row.poz_no !== 'string' ||
      !Array.isArray(row.fiyatlar) ||
      !row.fiyatlar.every((fiyat) => typeof fiyat === 'string')
    ) {
      return [];
    }
    return [
      {
        poz_no: row.poz_no,
        birim: typeof row.birim === 'string' ? row.birim : null,
        fiyatlar: row.fiyatlar,
      },
    ];
  });
}

export async function gorselDogrulamaGetir(secim: {
  aktarimId?: string;
  alan?: string;
  sayfa?: number;
}): Promise<AdminBolumVerisi<GorselDogrulamaVerisi>> {
  const bos: GorselDogrulamaVerisi = {
    aktarimlar: [],
    seciliAktarim: null,
    seciliAlan: null,
    ozet: null,
    kumeler: [],
    sayfalar: [],
  };
  try {
    const aktarimlar = await aktarimListesi();
    const seciliAktarim =
      aktarimlar.find((row) => row.id === secim.aktarimId) ?? aktarimlar[0] ?? null;
    if (!seciliAktarim) return { data: bos, hazir: true };

    const rpcParametreleri = {
      p_sahip_id: seciliAktarim.sahip_id,
      p_aktarim_id: seciliAktarim.id,
    };
    const [ozet, kumeler] = await Promise.all([
      rpc<GorselDogrulamaOzeti>('admin_gorsel_dogrulama_ozeti', rpcParametreleri, 8_000),
      rpc<GorselDogrulamaKumesi[]>('admin_gorsel_dogrulama_kumeleri', rpcParametreleri, 8_000),
    ]);
    const seciliKume = kumeler.find((kume) => kume.alan === secim.alan) ?? kumeler[0];
    const sayfaNumaralari = seciliKume
      ? kumeSayfalari(seciliKume, ozet.uyusmayan_sayfalar, secim.sayfa)
      : [];
    const adaylar = await Promise.all(
      sayfaNumaralari.map((sayfa) =>
        rpc<GorselDogrulamaSatiri[]>(
          'admin_gorsel_dogrulama_adaylari',
          {
            ...rpcParametreleri,
            p_sayfa: sayfa,
          },
          8_000,
        ),
      ),
    );
    let kanitlar: Array<Record<string, unknown>> = [];
    let kanitUyarisi: string | undefined;
    if (sayfaNumaralari.length) {
      try {
        kanitlar = await rpc<Array<Record<string, unknown>>>(
          'admin_gorsel_dogrulama_sayfalari',
          {
            ...rpcParametreleri,
            p_sayfalar: sayfaNumaralari,
          },
          6_000,
        );
      } catch {
        kanitUyarisi =
          'Sayfada okunan kanıt ayrıntıları alınamadı. Public kanıt RPC migration’ını uygulayıp yeniden deneyin.';
      }
    }
    return {
      data: {
        aktarimlar,
        seciliAktarim,
        seciliAlan: seciliKume?.alan ?? null,
        ozet,
        kumeler,
        sayfalar: sayfaNumaralari.map((sayfa, index) => {
          const sayfaKanitlari = kanitlar.filter((kanit) => Number(kanit.kaynak_sayfa) === sayfa);
          const kayitliBizimSatirlar = sayfaKanitlari.flatMap((kanit) =>
            gorselSatirlari(kanit.bizim_deger, 'adaylar'),
          );
          return {
            sayfa,
            bizimSatirlar: kayitliBizimSatirlar.length ? kayitliBizimSatirlar : adaylar[index],
            gorulenSatirlar: sayfaKanitlari.flatMap((kanit) =>
              gorselSatirlari(kanit.gorulen_deger, 'satirlar'),
            ),
            sonuc:
              (sayfaKanitlari[0]?.sonuc as
                | GorselDogrulamaVerisi['sayfalar'][number]['sonuc']
                | undefined) ?? null,
            gorunurluk:
              (sayfaKanitlari[0]?.gorunurluk as
                | GorselDogrulamaVerisi['sayfalar'][number]['gorunurluk']
                | undefined) ?? null,
            model: String(sayfaKanitlari[0]?.model ?? '') || null,
            gorselUrl: `/admin/rendered/${seciliAktarim.id}/${sayfa}`,
          };
        }),
        kanitUyarisi,
      },
      hazir: true,
    };
  } catch (error) {
    return { data: bos, hazir: false, uyari: altyapiUyarisi(error) };
  }
}

export async function paketleriGetir(): Promise<AdminBolumVerisi<YonetimPaketi[]>> {
  try {
    return { data: await rpc<YonetimPaketi[]>('admin_paketleri_listele'), hazir: true };
  } catch (error) {
    return { data: [], hazir: false, uyari: altyapiUyarisi(error) };
  }
}

export async function ticaretVerisiniGetir(): Promise<AdminBolumVerisi<TicaretVerisi>> {
  try {
    const data = await rpc<Partial<TicaretVerisi>>('admin_ticaret_ozeti');
    return {
      data: {
        paketler: data.paketler ?? [],
        kullanicilar: data.kullanicilar ?? [],
        kullanici_overridelari: data.kullanici_overridelari ?? [],
        kullanim: data.kullanim ?? [],
        odemeler: data.odemeler ?? [],
        banka_hesaplari: data.banka_hesaplari ?? [],
      },
      hazir: true,
    };
  } catch (error) {
    const [paketler, kaynak] = await Promise.all([paketleriGetir(), kaynakOzetiniGetir()]);
    return {
      data: {
        paketler: paketler.data,
        kullanicilar: [],
        kullanici_overridelari: [],
        kullanim: [],
        banka_hesaplari: [],
        odemeler: kaynak.odemeler.map((item) => {
          const row = item as unknown as Record<string, unknown>;
          const profil = row.kullanici_profilleri as Record<string, unknown> | null;
          return {
            id: String(row.id),
            eposta: profil?.eposta ? String(profil.eposta) : null,
            paket: null,
            tutar: Number(row.tutar ?? 0),
            para_birimi: String(row.para_birimi ?? 'TRY'),
            durum: String(row.durum ?? 'bekliyor'),
            olusturulma_zamani: String(row.olusturulma_zamani),
          };
        }),
      },
      hazir: false,
      uyari: paketler.uyari ?? altyapiUyarisi(error),
    };
  }
}

export async function kaynakOzetiniGetir() {
  const supabase = await createClient();
  const [kurumlar, yayinlar, odemeler, profiller, ozet] = await Promise.all([
    supabase.from('kurumlar').select('*').order('ad'),
    supabase
      .from('yayinlar')
      .select('id, baslik, donem_etiketi_ham, hak_durumu, kurumlar(ad), kitap_aileleri(ad)')
      .order('donem_sirasi', { ascending: false })
      .limit(100),
    supabase
      .from('odeme_bildirimleri')
      .select('*, kullanici_profilleri(eposta, ad_soyad)')
      .order('olusturulma_zamani', { ascending: false })
      .limit(100),
    supabase.rpc('admin_belge_profillerini_listele', { p_limit: 200 }),
    yonetimOzetiniGetir(),
  ]);
  return {
    kurumlar: kurumlar.data ?? [],
    yayinlar: yayinlar.data ?? [],
    odemeler: odemeler.data ?? [],
    profiller: (profiller.data ?? []) as BelgeProfili[],
    ozet,
    hata: [kurumlar.error, yayinlar.error, odemeler.error, profiller.error].find(Boolean)?.message,
  };
}
