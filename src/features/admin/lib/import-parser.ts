import * as XLSX from 'xlsx';

import type {
  AktarimDosyasi,
  AktarimDogrulamaHatasi,
  PozAktarimSatiri,
} from '@features/admin/types';

type HamSatir = Record<string, unknown>;

const ALAN_ESLEME: Record<string, keyof PozAktarimSatiri> = {
  POZ: 'poz',
  POZ_NO: 'poz',
  POZ_NUMARASI: 'poz',
  DESCRIPTION: 'description',
  ACIKLAMA: 'description',
  TANIM: 'description',
  UNIT: 'unit',
  BIRIM: 'unit',
  UNIT_PRICE: 'unit_price',
  BIRIM_FIYAT: 'unit_price',
  MONTAGE_PRICE: 'montage_price',
  MONTAJ_FIYATI: 'montage_price',
  DEMONTAGE_PRICE: 'demontage_price',
  DEMONTAJ_FIYATI: 'demontage_price',
  OLD_POZ: 'old_poz',
  ESKI_POZ: 'old_poz',
  DESCRIPTION_PREFIX: 'description_prefix',
  TANIM_ON_EKI: 'description_prefix',
  DESCRIPTION_SUFFIX: 'description_suffix',
  TANIM_SON_EKI: 'description_suffix',
  CATEGORY: 'category',
  KATEGORI: 'category',
  SUB_CATEGORY: 'sub_category',
  ALT_KATEGORI: 'sub_category',
  BUY_PLACE: 'buy_place',
  SATIN_ALMA_YERI: 'buy_place',
  FASCICLE: 'fascicle',
  FASIKUL: 'fascicle',
  NOTE: 'note',
  NOT: 'note',
  PAGE: 'page',
  SAYFA: 'page',
  TYPE: 'record_type',
  TUR: 'record_type',
};

function anahtarNormalize(deger: string): string {
  return deger
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replaceAll('İ', 'I')
    .replaceAll('Ş', 'S')
    .replaceAll('Ğ', 'G')
    .replaceAll('Ü', 'U')
    .replaceAll('Ö', 'O')
    .replaceAll('Ç', 'C')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function metin(deger: unknown): string | null {
  if (deger === null || deger === undefined) return null;
  const sonuc = String(deger).trim();
  return sonuc === '' ? null : sonuc;
}

function fiyat(deger: unknown): string | null {
  const ham = metin(deger);
  if (!ham) return null;
  const temiz = ham
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const sayi = Number(temiz);
  if (!Number.isFinite(sayi) || sayi < 0) return null;
  return sayi.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function satirDonustur(ham: HamSatir, index: number): PozAktarimSatiri {
  const eslenmis: Record<string, unknown> = {};
  for (const [anahtar, deger] of Object.entries(ham)) {
    const hedef = ALAN_ESLEME[anahtarNormalize(anahtar)];
    if (hedef) eslenmis[hedef] = deger;
  }

  const kayitTuru = metin(eslenmis.record_type)?.toLocaleLowerCase('tr-TR');
  const izinliTurler = new Set(['unit_price', 'rayic', 'karsiz', 'other']);

  return {
    poz: metin(eslenmis.poz) ?? '',
    description: metin(eslenmis.description) ?? '',
    unit: metin(eslenmis.unit),
    unit_price: fiyat(eslenmis.unit_price),
    montage_price: fiyat(eslenmis.montage_price),
    demontage_price: fiyat(eslenmis.demontage_price),
    old_poz: metin(eslenmis.old_poz),
    description_prefix: metin(eslenmis.description_prefix),
    description_suffix: metin(eslenmis.description_suffix),
    category: metin(eslenmis.category),
    sub_category: metin(eslenmis.sub_category),
    buy_place: metin(eslenmis.buy_place),
    fascicle: metin(eslenmis.fascicle),
    note: metin(eslenmis.note),
    page: Math.max(1, Number(eslenmis.page) || 1),
    source_row: index + 2,
    source_table: null,
    record_type: izinliTurler.has(kayitTuru ?? '')
      ? (kayitTuru as PozAktarimSatiri['record_type'])
      : 'unit_price',
  };
}

export function aktarimSatirlariniDogrula(satirlar: PozAktarimSatiri[]): AktarimDogrulamaHatasi[] {
  const hatalar: AktarimDogrulamaHatasi[] = [];
  const gorulen = new Map<string, number>();
  satirlar.forEach((satir, index) => {
    const satirNo = index + 2;
    if (!satir.poz)
      hatalar.push({ satir: satirNo, alan: 'POZ', mesaj: 'Poz numarası zorunludur.' });
    if (!satir.description) {
      hatalar.push({ satir: satirNo, alan: 'DESCRIPTION', mesaj: 'Açıklama zorunludur.' });
    }
    if (!satir.unit_price && !satir.montage_price && !satir.demontage_price) {
      hatalar.push({ satir: satirNo, alan: 'UNIT_PRICE', mesaj: 'En az bir fiyat girilmelidir.' });
    }
    for (const [alan, deger] of [
      ['UNIT_PRICE', satir.unit_price],
      ['MONTAGE_PRICE', satir.montage_price],
      ['DEMONTAGE_PRICE', satir.demontage_price],
    ] as const) {
      if (deger !== null && (!Number.isFinite(Number(deger)) || Number(deger) < 0)) {
        hatalar.push({
          satir: satirNo,
          alan,
          mesaj: 'Fiyat sıfır veya daha büyük sayı olmalıdır.',
        });
      }
    }
    const kod = satir.poz.replace(/\s/g, '').toLocaleUpperCase('tr-TR');
    const onceki = gorulen.get(kod);
    if (kod && onceki !== undefined) {
      hatalar.push({
        satir: satirNo,
        alan: 'POZ',
        mesaj: `Dosya içinde tekrar ediyor; ilk satır ${onceki}.`,
      });
    } else if (kod) {
      gorulen.set(kod, satirNo);
    }
  });
  return hatalar;
}

export async function aktarimDosyasiniOku(file: File): Promise<AktarimDosyasi> {
  const uzanti = file.name.split('.').pop()?.toLocaleLowerCase('tr-TR') ?? '';
  let hamSatirlar: HamSatir[];

  if (uzanti === 'json') {
    const veri: unknown = JSON.parse(await file.text());
    const dizi = Array.isArray(veri)
      ? veri
      : typeof veri === 'object' &&
          veri !== null &&
          Array.isArray((veri as { rows?: unknown }).rows)
        ? (veri as { rows: unknown[] }).rows
        : null;
    if (!dizi) throw new Error('JSON dosyası bir satır dizisi veya { rows: [] } içermelidir.');
    hamSatirlar = dizi.filter(
      (satir): satir is HamSatir => typeof satir === 'object' && satir !== null,
    );
  } else if (['xlsx', 'xls', 'csv'].includes(uzanti)) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
    const ilkSayfa = workbook.SheetNames[0];
    if (!ilkSayfa) throw new Error('Dosyada okunabilir çalışma sayfası bulunamadı.');
    hamSatirlar = XLSX.utils.sheet_to_json<HamSatir>(workbook.Sheets[ilkSayfa], {
      defval: null,
      raw: false,
    });
  } else {
    throw new Error('Desteklenen dosya türleri: JSON, CSV, XLSX ve XLS.');
  }

  const satirlar = hamSatirlar.map(satirDonustur);
  let sonKategori: string | null = null;
  let sonAltKategori: string | null = null;
  for (const satir of satirlar) {
    if (satir.category) sonKategori = satir.category;
    else satir.category = sonKategori;
    if (satir.sub_category) sonAltKategori = satir.sub_category;
    else satir.sub_category = sonAltKategori;
  }
  return {
    satirlar,
    hatalar: aktarimSatirlariniDogrula(satirlar),
    dosyaAdi: file.name,
    bicim: uzanti,
  };
}
