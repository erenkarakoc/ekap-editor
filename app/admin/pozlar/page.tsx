import { PositionsView } from '@features/admin/components/positions-view';
import {
  pozDetayiniGetir,
  pozFiltreSecenekleriniGetir,
  pozlariGetir,
} from '@features/admin/lib/admin-data';

export default async function PozlarPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    kurum?: string;
    yayin?: string;
    tur?: string;
    birim?: string;
    baslik?: string;
    offset?: string;
    poz?: string;
  }>;
}) {
  const params = await searchParams;
  const uuidMi = (value?: string): string | null =>
    value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
      ? value
      : null;
  const offset = params.offset && /^\d+$/.test(params.offset) ? Number(params.offset) : 0;
  const filtre = {
    arama: params.q?.trim() ?? '',
    kurumId: uuidMi(params.kurum),
    yayinId: uuidMi(params.yayin),
    kayitTuru: params.tur?.trim() || null,
    birimKodu: params.birim?.trim() || null,
    basliklariGoster: params.baslik === '1',
    limit: 50,
    offset,
  };
  const [pozlar, secenekler, detay] = await Promise.all([
    pozlariGetir(filtre),
    pozFiltreSecenekleriniGetir(),
    pozDetayiniGetir(uuidMi(params.poz) ?? undefined),
  ]);
  return (
    <PositionsView pozlar={pozlar} detay={detay} initialFilters={filtre} secenekler={secenekler} />
  );
}
