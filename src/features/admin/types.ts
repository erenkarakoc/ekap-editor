export interface PozAktarimSatiri {
  poz: string;
  description: string;
  unit: string | null;
  unit_price: string | null;
  montage_price: string | null;
  demontage_price: string | null;
  old_poz: string | null;
  description_prefix: string | null;
  description_suffix: string | null;
  category: string | null;
  sub_category: string | null;
  buy_place: string | null;
  fascicle: string | null;
  note: string | null;
  page: number;
  source_row: number;
  source_table: string | null;
  record_type: 'unit_price' | 'rayic' | 'karsiz' | 'other';
}

export interface AktarimDogrulamaHatasi {
  satir: number;
  alan: string;
  mesaj: string;
}

export interface AktarimDosyasi {
  satirlar: PozAktarimSatiri[];
  hatalar: AktarimDogrulamaHatasi[];
  dosyaAdi: string;
  bicim: string;
}

export type GorevDurumu =
  | 'bekliyor'
  | 'calisiyor'
  | 'tekrar_bekliyor'
  | 'insan_bekliyor'
  | 'tamamlandi'
  | 'basarisiz'
  | 'iptal';

export interface AdminOzet {
  worker: { cevrimici: number; toplam: number; son_kalp_atisi: string | null };
  gorevler: Record<string, number>;
  inceleme_bekleyen: number;
  poz_sayisi: number;
  yayin_sayisi: number;
  aktarim_sayisi: number;
  bekleyen_odeme: number;
}

export interface AdminGorev {
  id: string;
  tur: string;
  durum: GorevDurumu;
  oncelik: number;
  girdi_json: Record<string, unknown>;
  sonuc_json: Record<string, unknown> | null;
  hata_mesaji: string | null;
  deneme_sayisi: number;
  maks_deneme: number;
  ust_gorev_id: string | null;
  belge_id: string | null;
  atanan_ajan: string | null;
  strateji: string | null;
  olusturma_tarihi: string;
  baslama_tarihi: string | null;
  bitis_tarihi: string | null;
}

export interface YonetimOlayi {
  id: number;
  gorev_id: string | null;
  calisma_id: number | null;
  sira_no: number;
  olay_turu: 'durum' | 'metin' | 'dusunme' | 'arac' | 'metrik' | 'hata';
  baslik: string | null;
  icerik: string | null;
  veri_json: Record<string, unknown>;
  olusturma_tarihi: string;
}

export interface WorkerDurumu {
  worker_id: string;
  ana_makine: string;
  durum: 'cevrimici' | 'mesgul' | 'duraklatildi' | 'hata' | 'cevrimdisi';
  surum: string | null;
  gorev_turleri: string[];
  ollama_durumu: 'hazir' | 'ulasamiyor' | 'bilinmiyor';
  modeller: Array<{ ad: string; boyut?: number; aile?: string; aktif?: boolean }>;
  son_kalp_atisi: string;
  aktif_gorev_id: string | null;
  bilgiler: Record<string, unknown>;
}

export interface AjanTanimi {
  id?: string;
  kod: string;
  surum?: number;
  ad: string;
  aciklama: string;
  rol: string;
  model: string;
  fallback_model: string | null;
  prompt_adi: string;
  prompt_surumu: string;
  parametreler: Record<string, unknown>;
  araclar: string[];
  cikti_semasi: Record<string, unknown>;
  aktif_mi: boolean;
  olusturma_tarihi?: string;
}

export interface IncelemeKaydi {
  id: string;
  tur: 'ajan_onerisi' | 'belge_profili' | 'poz_duzeltmesi' | 'dosya_degisikligi';
  durum: 'taslak' | 'inceleme_bekliyor' | 'onaylandi' | 'reddedildi' | 'iptal';
  baslik: string;
  ozet: string | null;
  guven_puani: number | null;
  kaynak_turu: string | null;
  kaynak_id: string | null;
  onerilen_veri: Record<string, unknown>;
  mevcut_veri: Record<string, unknown>;
  kurallar: Record<string, unknown>;
  gerekce: string | null;
  olusturma_tarihi: string;
}

export interface AdminPoz {
  poz_surumu_id: string;
  poz_id: string;
  poz_numarasi: string;
  tanim: string;
  birim: string | null;
  kurum: string | null;
  kitap: string | null;
  yayin: string | null;
  kayit_turu: string;
  kaynak_sayfa: number | null;
  duzeltme_var_mi: boolean;
  temel_hash: string;
  analiz: Record<string, unknown> | null;
  tarif: string | null;
  kaynak_belge_yolu: string | null;
  fiyatlar: Array<{
    id: string;
    fiyat_turu: string;
    tutar: number;
    para_birimi_kodu: string;
    birim_ham: string | null;
  }>;
}

export interface PaketYetkisi {
  ozellik_kodu: string;
  ad: string;
  kategori: string;
  deger_turu: 'boolean' | 'integer' | 'decimal';
  etkin: boolean;
  limit_degeri: number | null;
  limit_periyodu: 'gunluk' | 'aylik' | 'fatura_donemi' | null;
}

export interface YonetimPaketi {
  id: string;
  kod: string;
  ad: string;
  aciklama: string | null;
  aktif_mi: boolean;
  gorunur_mi: boolean;
  satisa_acik_mi: boolean;
  deneme_gunu: number;
  seviye: number;
  donemler: Array<{
    id: string;
    donem: 'aylik' | 'yillik';
    sure_ay: number;
    fiyat: number | null;
    para_birimi: string;
    aktif_mi: boolean;
  }>;
  yetkiler: PaketYetkisi[];
}

export interface TicaretVerisi {
  paketler: YonetimPaketi[];
  kullanicilar: Array<{
    id: string;
    eposta: string | null;
    ad_soyad: string | null;
    paket: string | null;
    abonelik_durumu: string | null;
  }>;
  kullanici_overridelari: Array<{
    id: string;
    kullanici_id: string;
    eposta: string | null;
    ozellik_kodu: string;
    karar: 'izin' | 'yasak' | 'limit';
    limit_degeri: number | null;
    bitis_tarihi: string | null;
    olusturma_tarihi: string;
  }>;
  odemeler: Array<{
    id: string;
    eposta: string | null;
    paket: string | null;
    tutar: number;
    para_birimi: string;
    durum: string;
    olusturulma_zamani: string;
  }>;
  kullanim: Array<{
    ozellik_kodu: string;
    kullanici_sayisi: number;
    toplam_kullanim: number;
    limit_asimi: number;
  }>;
  banka_hesaplari: Array<{
    id: string;
    banka_adi: string;
    alici_adi: string;
    iban: string;
    aciklama: string | null;
    aktif_mi: boolean;
    guncellenme_zamani: string;
  }>;
  audit: Array<{
    id: number;
    admin_id: string;
    islem: string;
    hedef_turu: string;
    hedef_id: string | null;
    detay: Record<string, unknown>;
    olusturulma_zamani: string;
  }>;
}

export interface AdminBolumVerisi<T> {
  data: T;
  hazir: boolean;
  uyari?: string;
}

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
