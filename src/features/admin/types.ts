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
  record_type: 'unit_price' | 'rayic' | 'karsiz' | 'bolum_basligi' | 'analysis_header' | 'other';
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
  gorev_toplami: number;
  aktif_gorev_sayisi: number;
  tamamlanan_gorev_sayisi: number;
  basarisiz_gorev_sayisi: number;
  gorev_basari_orani: number;
  poz_sayisi: number;
  poz_surumu_sayisi: number;
  fiyat_sayisi: number;
  yayin_sayisi: number;
  kurum_sayisi: number;
  belge_sayisi: number;
  sayfa_sayisi: number;
  profil_sayisi: number;
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
  strateji: string | null;
  olusturma_tarihi: string;
  baslama_tarihi: string | null;
  bitis_tarihi: string | null;
  kilit_tarihi?: string | null;
  bayat_mi?: boolean;
}

export type AktarimDurumu =
  | 'planned'
  | 'running'
  | 'complete'
  | 'failed'
  | 'stopped'
  | 'needs_review';

export interface AktarimCalismasi {
  id: string;
  sahip_id: string;
  yayin_id: string | null;
  aktarim_turu: string;
  ayristirici_adi: string;
  ayristirici_surumu: string;
  durum: AktarimDurumu;
  baslama_zamani: string | null;
  tamamlanma_zamani: string | null;
  gorulen_belge_sayisi: number;
  gorulen_ham_satir_sayisi: number;
  islenen_poz_sayisi: number;
  islenen_surum_sayisi: number;
  islenen_fiyat_sayisi: number;
  uyari_sayisi: number;
  hata_sayisi: number;
  parametreler: Record<string, unknown>;
  olusturulma_zamani: string;
  yayin: string | null;
  kurum: string | null;
  belge: string | null;
}

export interface AktarimDetayi {
  aktarim: AktarimCalismasi;
  ozet: Record<string, unknown> | null;
  normalize: Record<string, unknown> | null;
  tutarlilik: Record<string, unknown> | null;
  sayfaRaporu: Record<string, unknown> | null;
  hataRaporu: Record<string, unknown> | null;
  hamSatirOrnekleri: Record<string, unknown> | null;
  tutarlilikUyarisi?: string;
}

export interface GorselDogrulamaOzeti {
  toplam: number;
  uyusuyor: number;
  uyusmuyor: number;
  okunamadi: number;
  hata: number;
  sayfa: number;
  uyusmayan_sayfalar: number[];
}

export interface GorselDogrulamaKumesi {
  alan: 'birim' | 'fiyat';
  adet: number;
  ilk_sayfa: number;
  son_sayfa: number;
  sayfa: number;
  ornek_poz: string[];
}

export interface GorselDogrulamaSatiri {
  poz_no: string;
  birim: string | null;
  fiyatlar: string[];
}

export interface GorselDogrulamaSayfasi {
  sayfa: number;
  bizimSatirlar: GorselDogrulamaSatiri[];
  gorulenSatirlar: GorselDogrulamaSatiri[];
  sonuc: 'uyusuyor' | 'uyusmuyor' | 'okunamadi' | 'hata' | null;
  gorunurluk: 'net' | 'bulanik' | 'okunamiyor' | null;
  model: string | null;
  gorselUrl: string;
}

export interface GorselDogrulamaVerisi {
  aktarimlar: AktarimCalismasi[];
  seciliAktarim: AktarimCalismasi | null;
  seciliAlan: GorselDogrulamaKumesi['alan'] | null;
  ozet: GorselDogrulamaOzeti | null;
  kumeler: GorselDogrulamaKumesi[];
  sayfalar: GorselDogrulamaSayfasi[];
  kanitUyarisi?: string;
}

export interface PozFiltresi {
  arama: string;
  kurumId: string | null;
  yayinId: string | null;
  kayitTuru: string | null;
  birimKodu: string | null;
  basliklariGoster: boolean;
  limit: number;
  offset: number;
}

export interface PozFiltreSecenekleri {
  kurumlar: Array<{ id: string; ad: string }>;
  yayinlar: Array<{ id: string; baslik: string; kurum_id: string }>;
  birimler: Array<{ kod: string; ad: string }>;
}

export interface PozFiyati {
  id?: string;
  fiyat_turu: string;
  tutar_ham?: string | null;
  tutar: number;
  para_birimi_kodu: string;
  birim_ham: string | null;
}

export interface PozListeKaydi {
  poz_surumu_id: string;
  poz_id: string;
  kurum_id: string;
  kurum_kodu: string;
  kurum_adi: string;
  kitap_ailesi_anahtari: string;
  kitap_ailesi_adi: string;
  fasikul_adi: string | null;
  yayin_id: string;
  yayin_basligi: string;
  donem_etiketi_ham: string | null;
  kod_ham: string;
  kod_normalize: string;
  kayit_turu: string;
  tanim_ham: string;
  tanim_on_eki: string | null;
  birim_ham: string | null;
  birim_kodu: string | null;
  kaynak_url: string;
  kaynak_sha256: string | null;
  kaynak_sayfa: number;
  fiyatlar: PozFiyati[];
}

export interface PozGezginiSonucu {
  kayitlar: PozListeKaydi[];
  toplam: number;
  limit: number;
  offset: number;
}

export interface AnalizKullanimi {
  kullanan_poz_id: string;
  kullanan_poz_numarasi: string;
  kullanan_poz_tanimi: string;
  kullanan_poz_birimi: string | null;
  donem: string | null;
  satir_no: number;
  miktar: number | null;
  birim_fiyat: number | null;
  satir_toplami: number | null;
}

export interface PozDetayi {
  sahip_id: string;
  poz_id: string;
  poz_surumu_id: string;
  kurum_kodu: string;
  kurum_adi: string;
  kitap_anahtari: string;
  kitap_adi: string;
  fasikul_adi: string | null;
  poz_numarasi: string;
  eski_poz_numarasi: string | null;
  tanim: string;
  tanim_on_eki: string | null;
  tanim_son_eki: string | null;
  birim: string | null;
  kategori: string | null;
  alt_kategori: string | null;
  satin_alma_yeri: string | null;
  notlar: string | null;
  poz_turu: string;
  donem: string | null;
  yil: number | null;
  ay: number | null;
  donem_revizyonu: string | null;
  fiyatlar: PozFiyati[];
  guncelleme_endeksleri: Array<{ kod: string; tanim: string }> | null;
  tarif: string | null;
  olcum_kurali: string | null;
  odeme_esasi: string | null;
  dahil_olan_masraflar: string[] | null;
  dahil_olmayan_masraflar: string[] | null;
  analiz_satiri_sayisi: number;
  kaynak_url: string;
  kaynak_sha256: string | null;
  kaynak_sayfa: number;
  kaynak_tablo: string | null;
  kaynak_satir: number | null;
  ek_sutunlar: string[];
  temel_hash: string;
  duzeltme_var_mi: boolean;
  kullanildigi_analizler: AnalizKullanimi[];
}

export interface PozIncelemeDegerleri {
  eski_poz_numarasi: string | null;
  tanim: string;
  tanim_on_eki: string | null;
  tanim_son_eki: string | null;
  birim: string | null;
  birim_kodu: string | null;
  poz_turu: string;
  kategori: string | null;
  alt_kategori: string | null;
  satin_alma_yeri: string | null;
  notlar: string | null;
  tarif: string | null;
  olcum_kurali: string | null;
  odeme_esasi: string | null;
  dahil_olan_masraflar: string[];
  dahil_olmayan_masraflar: string[];
  fiyatlar: PozFiyati[];
}

export interface PozKaynakBelgesi {
  id: string;
  aktarim_id: string;
  kaynak_url: string;
  dosya_adi: string | null;
  mime_turu: string | null;
  depolama_kovasi: string | null;
  depolama_yolu: string | null;
  sha256: string | null;
  sayfa_sayisi: number | null;
  kaynak_sayfa: number;
}

export interface BekleyenPozDuzeltmesi {
  id: string;
  surum_no: number;
  gerekce: string;
  olusturma_tarihi: string;
}

export interface PozIncelemeDetayi {
  poz: PozDetayi;
  ham: PozIncelemeDegerleri;
  temel_hash: string;
  etkin_birim_kodu: string | null;
  belge: PozKaynakBelgesi;
  bekleyen_duzeltme: BekleyenPozDuzeltmesi | null;
}

export interface PozIncelemeKomsulari {
  onceki_poz_surumu_id: string | null;
  sonraki_poz_surumu_id: string | null;
  sira: number;
  toplam: number;
}

export interface BelgeProfili {
  id: number;
  kurum_id: string;
  kurum: string;
  belge_turu: string;
  surum: number;
  durum: 'taslak' | 'onaylandi' | 'reddedildi' | 'eskimis';
  kurallar_json: Record<string, unknown>;
  ornek_sayfa_json: unknown[];
  guven_puani: number | null;
  olusturan_gorev_id: string | null;
  notlar: string | null;
  olusturma_tarihi: string;
  guncelleme_tarihi: string;
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
  son_kalp_atisi: string;
  aktif_gorev_id: string | null;
  bilgiler: Record<string, unknown>;
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
