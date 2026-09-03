import 'server-only';

import { createClient } from '@shared/lib/supabase/server';
import type {
  AdminBolumVerisi,
  AdminGorev,
  AdminOzet,
  AdminPoz,
  AjanTanimi,
  IncelemeKaydi,
  TicaretVerisi,
  WorkerDurumu,
  YonetimPaketi,
} from '@features/admin/types';

const BOS_OZET: AdminOzet = {
  worker: { cevrimici: 0, toplam: 0, son_kalp_atisi: null },
  gorevler: {},
  inceleme_bekleyen: 0,
  poz_sayisi: 0,
  yayin_sayisi: 0,
  aktarim_sayisi: 0,
  bekleyen_odeme: 0,
};

async function rpc<T>(ad: string, parametreler: Record<string, unknown> = {}): Promise<T> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(ad, parametreler);
  if (error) throw new Error(error.message);
  return data as T;
}

function altyapiUyarisi(error: unknown) {
  const mesaj = error instanceof Error ? error.message : String(error);
  return `Yönetim merkezi migration'ı henüz uygulanmamış veya erişim reddedilmiş: ${mesaj}`;
}

export async function yonetimOzetiniGetir(): Promise<AdminBolumVerisi<AdminOzet>> {
  try {
    return { data: await rpc<AdminOzet>('admin_yonetim_ozeti'), hazir: true };
  } catch (error) {
    const supabase = await createClient();
    const [poz, yayin, aktarim, odeme] = await Promise.all([
      supabase.from('pozlar').select('id', { count: 'exact', head: true }),
      supabase.from('yayinlar').select('id', { count: 'exact', head: true }),
      supabase.from('aktarim_calismalari').select('id', { count: 'exact', head: true }),
      supabase
        .from('odeme_bildirimleri')
        .select('id', { count: 'exact', head: true })
        .eq('durum', 'bekliyor'),
    ]);
    return {
      data: {
        ...BOS_OZET,
        poz_sayisi: poz.count ?? 0,
        yayin_sayisi: yayin.count ?? 0,
        aktarim_sayisi: aktarim.count ?? 0,
        bekleyen_odeme: odeme.count ?? 0,
      },
      hazir: false,
      uyari: altyapiUyarisi(error),
    };
  }
}

export async function gorevleriGetir(): Promise<AdminBolumVerisi<AdminGorev[]>> {
  try {
    return {
      data: await rpc<AdminGorev[]>('admin_gorevleri_listele', {
        p_durum: null,
        p_tur: null,
        p_limit: 200,
        p_cursor: null,
      }),
      hazir: true,
    };
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

export async function ajanlariGetir(): Promise<AdminBolumVerisi<AjanTanimi[]>> {
  try {
    return { data: await rpc<AjanTanimi[]>('admin_ajan_tanimlarini_listele'), hazir: true };
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

export async function pozlariGetir(arama = ''): Promise<AdminBolumVerisi<AdminPoz[]>> {
  try {
    return {
      data: await rpc<AdminPoz[]>('admin_pozlari_ara', {
        p_arama: arama,
        p_kurum_id: null,
        p_yayin_id: null,
        p_kayit_turu: null,
        p_limit: 100,
        p_offset: 0,
      }),
      hazir: true,
    };
  } catch (error) {
    return { data: [], hazir: false, uyari: altyapiUyarisi(error) };
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
        audit: data.audit ?? [],
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
        audit: [],
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
  const [kurumlar, yayinlar, aktarimlar, odemeler, profiller] = await Promise.all([
    supabase.from('kurumlar').select('*').order('ad'),
    supabase
      .from('yayinlar')
      .select('id, baslik, donem_etiketi_ham, durum, kurumlar(ad), kitap_aileleri(ad)')
      .order('donem_sirasi', { ascending: false })
      .limit(100),
    supabase
      .from('aktarim_calismalari')
      .select('*')
      .order('olusturulma_zamani', { ascending: false })
      .limit(100),
    supabase
      .from('odeme_bildirimleri')
      .select('*, kullanici_profilleri(eposta, ad_soyad)')
      .order('olusturulma_zamani', { ascending: false })
      .limit(100),
    supabase.rpc('admin_belge_profillerini_listele', { p_limit: 200 }),
  ]);
  return {
    kurumlar: kurumlar.data ?? [],
    yayinlar: yayinlar.data ?? [],
    aktarimlar: aktarimlar.data ?? [],
    odemeler: odemeler.data ?? [],
    profiller: profiller.data ?? [],
    hata: [kurumlar.error, yayinlar.error, aktarimlar.error, odemeler.error, profiller.error].find(
      Boolean,
    )?.message,
  };
}
