import Decimal from 'decimal.js';
import { z } from 'zod';

const priceSchema = z.object({
  id: z.string().optional().nullable(),
  fiyat_turu: z.string(),
  tutar: z.union([z.string(), z.number()]),
  para_birimi_kodu: z.string(),
  birim_ham: z.string().nullable().optional(),
});
const rowSchema = z.object({
  poz_surumu_id: z.string(), poz_numarasi: z.string(), tanim: z.string(),
  kurum_kodu: z.string(), kitap_adi: z.string(), donem: z.string(),
  birim: z.string().nullable(), fiyatlar: z.array(priceSchema).nullable(),
  kaynak_url: z.string().nullable().optional(),
  kaynak_sayfa: z.number().nullable().optional(),
});

export interface CatalogSource {
  versionId: string;
  priceId: string | null;
  priceType: string;
  priceAmount: string;
  currency: string;
  unit: string;
  institution: string;
  period: string;
  book: string;
  url: string | null;
  page: number | null;
}
export interface CatalogEntry {
  key: string;
  pozNo: string;
  description: string;
  unit: string;
  unitPrice: Decimal;
  institution: string;
  source: CatalogSource;
}
export const priceLabels: Record<string, string> = {
  unit_price: 'Birim fiyat', rayic: 'Rayiç', montage_price: 'Montaj',
  demontage_price: 'Demontaj',
};

export function catalogEntries(data: unknown): CatalogEntry[] {
  const rows = z.array(rowSchema).parse(data);
  const entries = new Map<string, CatalogEntry>();
  for (const row of rows) {
    for (const price of row.fiyatlar ?? []) {
      // Cost screens currently calculate in TRY; never silently mix currencies.
      if (price.para_birimi_kodu !== 'TRY') continue;
      const unit = price.birim_ham?.trim() || row.birim?.trim();
      if (!unit || String(price.tutar).trim() === '') continue;
      let amount: Decimal;
      try { amount = new Decimal(price.tutar); } catch { continue; }
      if (!amount.isFinite()) continue;
      const source: CatalogSource = {
        versionId: row.poz_surumu_id, priceId: price.id ?? null,
        priceType: price.fiyat_turu, priceAmount: amount.toString(), currency: 'TRY',
        unit, institution: row.kurum_kodu, period: row.donem, book: row.kitap_adi,
        url: row.kaynak_url ?? null, page: row.kaynak_sayfa ?? null,
      };
      const key = JSON.stringify([source.versionId, source.priceId, source.priceType,
        unit, source.priceAmount, source.currency]);
      entries.set(key, { key, pozNo: row.poz_numarasi, description: row.tanim,
        unit, unitPrice: amount, institution: row.kurum_kodu, source });
    }
  }
  return [...entries.values()];
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
