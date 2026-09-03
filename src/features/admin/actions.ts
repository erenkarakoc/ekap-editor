'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { adminOturumunuDogrula } from '@features/auth/dal';
import { createClient } from '@shared/lib/supabase/server';
import type { ActionResult } from '@features/admin/types';

const uuid = z.string().uuid();
const jsonNesnesi = z.record(z.string(), z.unknown());

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
    tur: z.string().trim().min(2).max(80),
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

export async function ajanCalistirAction(girdi: unknown): Promise<ActionResult> {
  const sonuc = z
    .object({
      ajanKodu: z.string().trim().min(2).max(80),
      model: z.string().trim().min(1).max(160),
      prompt: z.string().max(100_000),
      baglam: jsonNesnesi.default({}),
      parametreler: jsonNesnesi.default({}),
      araclar: z.array(z.string().max(80)).max(30).default([]),
      ciktiSemasi: jsonNesnesi.optional(),
    })
    .safeParse(girdi);
  if (!sonuc.success) return { ok: false, error: sonuc.error.issues[0]?.message };
  const cevap = await adminRpc('admin_gorev_olustur', {
    p_tur:
      sonuc.data.ajanKodu === 'model_konsolu' ? 'model_konsolu' : `ajan_${sonuc.data.ajanKodu}`,
    p_girdi_json: {
      model: sonuc.data.model,
      prompt: sonuc.data.prompt,
      baglam: sonuc.data.baglam,
      parametreler: sonuc.data.parametreler,
      araclar: sonuc.data.araclar,
      cikti_semasi: sonuc.data.ciktiSemasi,
    },
    p_oncelik: 100,
    p_maks_deneme: 2,
  });
  if (cevap.ok) revalidatePath('/admin/ajanlar');
  return cevap;
}

export async function ajanTanimiKaydetAction(girdi: unknown): Promise<ActionResult> {
  const sonuc = z
    .object({
      kod: z.string().regex(/^[a-z0-9_]+$/),
      ad: z.string().trim().min(2).max(100),
      aciklama: z.string().trim().min(3).max(1000),
      rol: z.string().trim().min(2).max(100),
      model: z.string().trim().min(1).max(160),
      fallbackModel: z.string().trim().max(160).nullable(),
      promptAdi: z.string().trim().min(1).max(160),
      promptSurumu: z.string().trim().min(1).max(80),
      parametreler: jsonNesnesi,
      araclar: z.array(z.string().regex(/^[a-z0-9_]+$/)).max(30),
      ciktiSemasi: jsonNesnesi,
      aktifMi: z.boolean(),
    })
    .safeParse(girdi);
  if (!sonuc.success) return { ok: false, error: sonuc.error.issues[0]?.message };
  const cevap = await adminRpc('admin_ajan_tanimi_surumu_kaydet', {
    p_tanim: {
      kod: sonuc.data.kod,
      ad: sonuc.data.ad,
      aciklama: sonuc.data.aciklama,
      rol: sonuc.data.rol,
      model: sonuc.data.model,
      fallback_model: sonuc.data.fallbackModel || null,
      prompt_adi: sonuc.data.promptAdi,
      prompt_surumu: sonuc.data.promptSurumu,
      parametreler: sonuc.data.parametreler,
      araclar: sonuc.data.araclar,
      cikti_semasi: sonuc.data.ciktiSemasi,
      aktif_mi: sonuc.data.aktifMi,
    },
  });
  if (cevap.ok) revalidatePath('/admin/ajanlar');
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
  const yil = sonuc.data.donemEtiketi.match(/\b(20\d{2})\b/)?.[1] ?? '';
  const cevap = await adminRpc('admin_kaynak_yayini_kaydet', {
    p_veri: {
      kurum_kodu: sonuc.data.kurumKodu,
      kurum_adi: sonuc.data.kurumAdi,
      kurum_resmi_adi: sonuc.data.kurumResmiAdi || null,
      kurum_url: sonuc.data.kurumUrl,
      katalog_anahtari: `${sonuc.data.kurumKodu}_RESMI`,
      katalog_adi: `${sonuc.data.kurumAdi} Resmî Yayınları`,
      kaynak_sayfasi_url: sonuc.data.kurumUrl,
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
