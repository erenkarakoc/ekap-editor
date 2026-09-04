'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { adminOturumunuDogrula } from '@features/auth/dal';
import { createClient } from '@shared/lib/supabase/server';
import type { ActionResult } from '@features/admin/types';

const uuid = z.string().uuid();
const jsonNesnesi = z.record(z.string(), z.unknown());
const gorevTuru = z.enum([
  'belge_isle',
  'sayfa_isle',
  'poz_normalize',
  'analiz_normalize',
  'gorsel_dogrula',
]);

async function adminRpc<T>(
  ad: string,
  parametreler: Record<string, unknown>,
): Promise<ActionResult<T>> {
  await adminOturumunuDogrula();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(ad, parametreler);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as T };
}

export async function gorevOlusturAction(girdi: unknown): Promise<ActionResult> {
  const schema = z.object({
    tur: gorevTuru,
    girdi: jsonNesnesi.default({}),
    oncelik: z.number().int().min(0).max(1000).default(100),
    maksDeneme: z.number().int().min(1).max(10).default(3),
  });
  const sonuc = schema.safeParse(girdi);
  if (!sonuc.success) return { ok: false, error: sonuc.error.issues[0]?.message };
  const cevap = await adminRpc('admin_gorev_olustur', {
    p_tur: sonuc.data.tur,
    p_girdi_json: sonuc.data.girdi,
    p_oncelik: sonuc.data.oncelik,
    p_maks_deneme: sonuc.data.maksDeneme,
  });
  if (cevap.ok) revalidatePath('/admin/operasyonlar');
  return cevap;
}

export async function gorevKilitleriniKurtarAction(girdi: unknown): Promise<ActionResult> {
  const sonuc = z.object({ kilitSuresiSn: z.number().int().min(60).max(86_400) }).safeParse(girdi);
  if (!sonuc.success) return { ok: false, error: sonuc.error.issues[0]?.message };
  const cevap = await adminRpc('admin_gorev_kilitlerini_kurtar', {
    p_kilit_suresi_sn: sonuc.data.kilitSuresiSn,
  });
  if (cevap.ok) revalidatePath('/admin/operasyonlar');
  return cevap;
}

export async function gorevKarariAction(girdi: unknown): Promise<ActionResult> {
  const sonuc = z
    .object({
      id: uuid,
      karar: z.enum(['iptal', 'yeniden_dene']),
      gerekce: z.string().trim().min(3),
    })
    .safeParse(girdi);
  if (!sonuc.success) return { ok: false, error: sonuc.error.issues[0]?.message };
  const cevap = await adminRpc('admin_gorev_karari', {
    p_gorev_id: sonuc.data.id,
    p_karar: sonuc.data.karar,
    p_gerekce: sonuc.data.gerekce,
  });
  if (cevap.ok) revalidatePath('/admin/operasyonlar');
  return cevap;
}

export async function pozAktariminiDurdurAction(girdi: unknown): Promise<ActionResult> {
  const sonuc = z
    .object({
      aktarimId: uuid,
      gerekce: z.string().trim().min(5).max(1000),
    })
    .safeParse(girdi);
  if (!sonuc.success) return { ok: false, error: sonuc.error.issues[0]?.message };
  const cevap = await adminRpc('poz_aktarimini_durdur', {
    p_aktarim_id: sonuc.data.aktarimId,
    p_gerekce: sonuc.data.gerekce,
  });
  if (cevap.ok) revalidatePath('/admin/aktarimlar');
  return cevap;
}

export async function belgeProfiliOnaylaAction(girdi: unknown): Promise<ActionResult> {
  const sonuc = z
    .object({
      profilId: z.number().int().positive(),
      kisitIhlaliSayisi: z.number().int().nonnegative(),
      cozulemeyenSatirSayisi: z.number().int().nonnegative(),
      aciklanamayanSayimFarki: z.number().int().nonnegative(),
      tutarliMi: z.boolean(),
      uyusmazSayfaSayisi: z.number().int().nonnegative(),
      enPahaliOrnekSayisi: z.number().int().nonnegative(),
      enUcuzOrnekSayisi: z.number().int().nonnegative(),
      elleOrneklemeNotu: z.string().trim().min(10).max(2000),
      gerekce: z.string().trim().min(10).max(2000),
    })
    .safeParse(girdi);
  if (!sonuc.success) return { ok: false, error: sonuc.error.issues[0]?.message };
  const kabul = {
    kisit_ihlali_sayisi: sonuc.data.kisitIhlaliSayisi,
    cozulemeyen_satir_sayisi: sonuc.data.cozulemeyenSatirSayisi,
    aciklanamayan_sayim_farki: sonuc.data.aciklanamayanSayimFarki,
    tutarli_mi: sonuc.data.tutarliMi,
    uyusmaz_sayfa_sayisi: sonuc.data.uyusmazSayfaSayisi,
    en_pahali_ornek_sayisi: sonuc.data.enPahaliOrnekSayisi,
    en_ucuz_ornek_sayisi: sonuc.data.enUcuzOrnekSayisi,
    elle_ornekleme_notu: sonuc.data.elleOrneklemeNotu,
  };
  const cevap = await adminRpc('admin_belge_profili_onayla', {
    p_profil_id: sonuc.data.profilId,
    p_kabul: kabul,
    p_gerekce: sonuc.data.gerekce,
  });
  if (cevap.ok) revalidatePath('/admin/kaynaklar');
  return cevap;
}

export async function incelemeKarariAction(girdi: unknown): Promise<ActionResult> {
  const sonuc = z
    .object({
      idler: z.array(uuid).min(1).max(500),
      karar: z.enum(['onayla', 'reddet']),
      gerekce: z.string().trim().min(3).max(2000),
      orneklemOnaylandi: z.boolean(),
      asgariGuven: z.number().min(0).max(1).default(0),
    })
    .safeParse(girdi);
  if (!sonuc.success) return { ok: false, error: sonuc.error.issues[0]?.message };
  if (sonuc.data.idler.length > 1 && !sonuc.data.orneklemOnaylandi) {
    return { ok: false, error: 'Toplu işlemden önce örneklem önizlemesini onaylayın.' };
  }
  const cevap = await adminRpc('admin_inceleme_karari', {
    p_idler: sonuc.data.idler,
    p_karar: sonuc.data.karar,
    p_gerekce: sonuc.data.gerekce,
    p_asgari_guven: sonuc.data.asgariGuven,
    p_orneklem_onaylandi: sonuc.data.orneklemOnaylandi,
  });
  if (cevap.ok) revalidatePath('/admin/inceleme');
  return cevap;
}

export async function pozDuzeltmeTaslagiAction(girdi: unknown): Promise<ActionResult> {
  const sonuc = z
    .object({
      pozSurumuId: uuid,
      temelHash: z.string().length(64),
      degisiklikler: jsonNesnesi,
      fiyatlar: z.array(jsonNesnesi).max(20).default([]),
      gerekce: z.string().trim().min(10).max(2000),
    })
    .safeParse(girdi);
  if (!sonuc.success) return { ok: false, error: sonuc.error.issues[0]?.message };
  const cevap = await adminRpc('admin_poz_duzeltme_taslagi_kaydet', {
    p_poz_surumu_id: sonuc.data.pozSurumuId,
    p_temel_hash: sonuc.data.temelHash,
    p_degisiklikler: sonuc.data.degisiklikler,
    p_fiyatlar: sonuc.data.fiyatlar,
    p_gerekce: sonuc.data.gerekce,
  });
  if (cevap.ok) revalidatePath('/admin/pozlar');
  return cevap;
}

const nullableMetin = (uzunluk: number) => z.string().trim().max(uzunluk).nullable();
const pozDuzeltmeAlanlari = z
  .object({
    eski_poz_numarasi: nullableMetin(160).optional(),
    tanim: z.string().trim().min(2).max(10_000).optional(),
    tanim_on_eki: nullableMetin(10_000).optional(),
    tanim_son_eki: nullableMetin(10_000).optional(),
    birim: nullableMetin(100).optional(),
    birim_kodu: nullableMetin(100).optional(),
    poz_turu: z
      .enum(['unit_price', 'rayic', 'karsiz', 'bolum_basligi', 'analysis_header', 'other'])
      .optional(),
    kategori: nullableMetin(500).optional(),
    alt_kategori: nullableMetin(500).optional(),
    satin_alma_yeri: nullableMetin(1000).optional(),
    notlar: nullableMetin(10_000).optional(),
    tarif: nullableMetin(50_000).optional(),
    olcum_kurali: nullableMetin(20_000).optional(),
    odeme_esasi: nullableMetin(20_000).optional(),
    dahil_olan_masraflar: z.array(z.string().trim().min(1).max(2000)).max(100).optional(),
    dahil_olmayan_masraflar: z.array(z.string().trim().min(1).max(2000)).max(100).optional(),
  })
  .strict();
const duzeltmeFiyati = z
  .object({
    fiyat_turu: z.enum([
      'unit_price',
      'alternate_unit_price',
      'montage_price',
      'demontage_price',
      'rayic',
      'karsiz',
      'component_unit_price',
      'other',
    ]),
    tutar: z
      .string()
      .trim()
      .regex(
        /^-?\d+(?:\.\d{1,4})?$/,
        'Tutar nokta ayracıyla ve en fazla dört ondalıkla yazılmalıdır.',
      ),
    tutar_ham: z.string().trim().max(100).optional(),
    para_birimi_kodu: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/),
    birim_ham: nullableMetin(100).optional(),
  })
  .strict();

export async function pozIncelemeTaslagiKaydetAction(girdi: unknown): Promise<ActionResult> {
  const sonuc = z
    .object({
      pozSurumuId: uuid,
      temelHash: z.string().regex(/^[0-9a-f]{64}$/),
      degisiklikler: pozDuzeltmeAlanlari,
      fiyatlar: z.array(duzeltmeFiyati).max(20).nullable(),
      gerekce: z.string().trim().min(10).max(2000),
    })
    .safeParse(girdi);
  if (!sonuc.success) return { ok: false, error: sonuc.error.issues[0]?.message };
  if (Object.keys(sonuc.data.degisiklikler).length === 0 && sonuc.data.fiyatlar === null) {
    return { ok: false, error: 'İncelemeye göndermek için en az bir alan değişmelidir.' };
  }
  const cevap = await adminRpc<{ inceleme_id: string }>('admin_poz_duzeltme_taslagi_kaydet_v2', {
    p_poz_surumu_id: sonuc.data.pozSurumuId,
    p_temel_hash: sonuc.data.temelHash,
    p_degisiklikler: sonuc.data.degisiklikler,
    p_fiyatlar: sonuc.data.fiyatlar,
    p_gerekce: sonuc.data.gerekce,
  });
  if (cevap.ok) {
    revalidatePath('/admin/pozlar');
    revalidatePath(`/admin/pozlar/${sonuc.data.pozSurumuId}/incele`);
    revalidatePath('/admin/inceleme');
  }
  return cevap;
}

export async function paketKaydetAction(girdi: unknown): Promise<ActionResult> {
  const sonuc = z
    .object({
      id: uuid.nullable(),
      kod: z.string().regex(/^[a-z0-9_]+$/),
      ad: z.string().trim().min(2).max(100),
      aciklama: z.string().max(1000).nullable(),
      aktifMi: z.boolean(),
      gorunurMu: z.boolean(),
      satisaAcikMi: z.boolean(),
      denemeGunu: z.number().int().min(0).max(365),
      seviye: z.number().int().min(0).max(100),
      donemler: z.array(jsonNesnesi).max(4),
      yetkiler: z.array(jsonNesnesi).max(500),
    })
    .safeParse(girdi);
  if (!sonuc.success) return { ok: false, error: sonuc.error.issues[0]?.message };
  const cevap = await adminRpc('admin_paket_kaydet', {
    p_paket: {
      id: sonuc.data.id,
      kod: sonuc.data.kod,
      ad: sonuc.data.ad,
      aciklama: sonuc.data.aciklama,
      aktif_mi: sonuc.data.aktifMi,
      gorunur_mi: sonuc.data.gorunurMu,
      satisa_acik_mi: sonuc.data.satisaAcikMi,
      deneme_gunu: sonuc.data.denemeGunu,
      seviye: sonuc.data.seviye,
      donemler: sonuc.data.donemler,
      yetkiler: sonuc.data.yetkiler,
    },
  });
  if (cevap.ok) revalidatePath('/admin/ticaret');
  return cevap;
}

export async function kaynakYayiniKaydetAction(girdi: unknown): Promise<ActionResult> {
  const sonuc = z
    .object({
      kurumKodu: z.string().trim().min(2).max(40),
      kurumAdi: z.string().trim().min(3).max(250),
      kurumResmiAdi: z.string().trim().max(300).optional(),
      kurumUrl: z.string().url(),
      kitapKodu: z.string().trim().min(2).max(80),
      kitapAdi: z.string().trim().min(3).max(250),
      yayinBasligi: z.string().trim().min(3).max(300),
      yayinTuru: z.string().trim().min(2).max(80),
      donemEtiketi: z.string().trim().min(2).max(100),
      dogrudanBelgeUrl: z.string().url().optional().or(z.literal('')),
    })
    .safeParse(girdi);
  if (!sonuc.success) return { ok: false, error: sonuc.error.issues[0]?.message };
  const kurumAdresi = new URL(sonuc.data.kurumUrl);
  if (kurumAdresi.hostname.toLocaleLowerCase('tr-TR').startsWith('www.')) {
    return {
      ok: false,
      error: 'Resmî kurum URL alanına www değil apex alan adı girin (ör. https://csb.gov.tr/).',
    };
  }
  const kurumApexUrl = `${kurumAdresi.protocol}//${kurumAdresi.hostname}/`;
  const yil = sonuc.data.donemEtiketi.match(/\b(20\d{2})\b/)?.[1] ?? '';
  const cevap = await adminRpc('admin_kaynak_yayini_kaydet', {
    p_veri: {
      kurum_kodu: sonuc.data.kurumKodu,
      kurum_adi: sonuc.data.kurumAdi,
      kurum_resmi_adi: sonuc.data.kurumResmiAdi || null,
      kurum_url: kurumApexUrl,
      katalog_anahtari: `${sonuc.data.kurumKodu}_RESMI`,
      katalog_adi: `${sonuc.data.kurumAdi} Resmî Yayınları`,
      kaynak_sayfasi_url: kurumApexUrl,
      kitap_anahtari: sonuc.data.kitapKodu,
      kitap_adi: sonuc.data.kitapAdi,
      yayin_basligi: sonuc.data.yayinBasligi,
      yayin_turu: sonuc.data.yayinTuru,
      donem_etiketi: sonuc.data.donemEtiketi,
      yil,
      belge_url: sonuc.data.dogrudanBelgeUrl || null,
      hak_durumu: 'review_required',
    },
  });
  if (cevap.ok) revalidatePath('/admin/kaynaklar');
  return cevap;
}

export async function kullaniciOverrideKaydetAction(girdi: unknown): Promise<ActionResult> {
  const sonuc = z
    .object({
      kullaniciId: uuid,
      ozellikKodu: z.string().regex(/^[a-z0-9_.-]+$/),
      karar: z.enum(['izin', 'yasak', 'limit']),
      limitDegeri: z.number().nonnegative().nullable(),
      bitisTarihi: z.string().datetime().nullable(),
      gerekce: z.string().trim().min(5).max(1000),
    })
    .safeParse(girdi);
  if (!sonuc.success) return { ok: false, error: sonuc.error.issues[0]?.message };
  const cevap = await adminRpc('admin_kullanici_override_kaydet', {
    p_kullanici_id: sonuc.data.kullaniciId,
    p_ozellik_kodu: sonuc.data.ozellikKodu,
    p_karar: sonuc.data.karar,
    p_limit_degeri: sonuc.data.limitDegeri,
    p_bitis_tarihi: sonuc.data.bitisTarihi,
    p_gerekce: sonuc.data.gerekce,
  });
  if (cevap.ok) revalidatePath('/admin/ticaret');
  return cevap;
}

export async function yetkiCozAction(girdi: unknown): Promise<ActionResult> {
  const sonuc = z
    .object({ kullaniciId: uuid, ozellikKodu: z.string().regex(/^[a-z0-9_.-]+$/) })
    .safeParse(girdi);
  if (!sonuc.success) return { ok: false, error: sonuc.error.issues[0]?.message };
  return adminRpc('ozellik_yetkisini_coz', {
    p_kullanici_id: sonuc.data.kullaniciId,
    p_ozellik_kodu: sonuc.data.ozellikKodu,
  });
}

export async function odemeKarariAction(girdi: unknown): Promise<ActionResult> {
  const sonuc = z
    .object({
      id: uuid,
      karar: z.enum(['onayla', 'reddet']),
      not: z.string().trim().max(1000),
    })
    .safeParse(girdi);
  if (!sonuc.success) return { ok: false, error: sonuc.error.issues[0]?.message };
  const cevap = await adminRpc(
    sonuc.data.karar === 'onayla' ? 'admin_odeme_onayla' : 'admin_odeme_reddet',
    { p_odeme_id: sonuc.data.id, p_admin_notu: sonuc.data.not || null },
  );
  if (cevap.ok) revalidatePath('/admin/ticaret');
  return cevap;
}

export async function bankaHesabiKaydetAction(girdi: unknown): Promise<ActionResult> {
  const sonuc = z
    .object({
      id: uuid.nullable(),
      bankaAdi: z.string().trim().min(2).max(160),
      aliciAdi: z.string().trim().min(2).max(200),
      iban: z
        .string()
        .transform((value) => value.replace(/\s+/g, '').toUpperCase())
        .pipe(z.string().regex(/^TR\d{24}$/, 'Geçerli bir TR IBAN girin.')),
      aciklama: z.string().trim().max(1000).nullable(),
      aktifMi: z.boolean(),
    })
    .safeParse(girdi);
  if (!sonuc.success) return { ok: false, error: sonuc.error.issues[0]?.message };
  const cevap = await adminRpc('admin_banka_hesabi_kaydet', {
    p_hesap: {
      id: sonuc.data.id,
      banka_adi: sonuc.data.bankaAdi,
      alici_adi: sonuc.data.aliciAdi,
      iban: sonuc.data.iban,
      aciklama: sonuc.data.aciklama,
      aktif_mi: sonuc.data.aktifMi,
    },
  });
  if (cevap.ok) revalidatePath('/admin/ticaret');
  return cevap;
}
