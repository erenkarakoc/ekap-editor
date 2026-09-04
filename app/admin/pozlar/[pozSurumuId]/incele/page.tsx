import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PozReviewWorkspace } from '@features/admin/components/poz-review-workspace';
import {
  pozFiltreSecenekleriniGetir,
  pozIncelemeDetayiniGetir,
  pozIncelemeKomsulariniGetir,
} from '@features/admin/lib/admin-data';
import type { PozFiltresi } from '@features/admin/types';
import { Alert, AlertDescription, AlertTitle } from '@shared/components/ui/alert';
import { Button } from '@shared/components/ui/button';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function PozIncelemePage({
  params,
  searchParams,
}: {
  params: Promise<{ pozSurumuId: string }>;
  searchParams: Promise<{
    q?: string;
    kurum?: string;
    yayin?: string;
    tur?: string;
    birim?: string;
    baslik?: string;
    offset?: string;
  }>;
}) {
  const [{ pozSurumuId }, query] = await Promise.all([params, searchParams]);
  if (!UUID_RE.test(pozSurumuId)) notFound();

  const uuidMi = (value?: string) => (value && UUID_RE.test(value) ? value : null);
  const filtre: PozFiltresi = {
    arama: query.q?.trim() ?? '',
    kurumId: uuidMi(query.kurum),
    yayinId: uuidMi(query.yayin),
    kayitTuru: query.tur?.trim() || null,
    birimKodu: query.birim?.trim() || null,
    basliklariGoster: query.baslik === '1',
    limit: 50,
    offset: query.offset && /^\d+$/.test(query.offset) ? Number(query.offset) : 0,
  };
  const listeParametreleri = new URLSearchParams();
  if (filtre.arama) listeParametreleri.set('q', filtre.arama);
  if (filtre.kurumId) listeParametreleri.set('kurum', filtre.kurumId);
  if (filtre.yayinId) listeParametreleri.set('yayin', filtre.yayinId);
  if (filtre.kayitTuru) listeParametreleri.set('tur', filtre.kayitTuru);
  if (filtre.birimKodu) listeParametreleri.set('birim', filtre.birimKodu);
  if (filtre.basliklariGoster) listeParametreleri.set('baslik', '1');
  if (filtre.offset) listeParametreleri.set('offset', String(filtre.offset));
  const queryString = listeParametreleri.toString();

  const [detay, komsular, secenekler] = await Promise.all([
    pozIncelemeDetayiniGetir(pozSurumuId),
    pozIncelemeKomsulariniGetir(pozSurumuId, filtre),
    pozFiltreSecenekleriniGetir(),
  ]);

  if (!detay.data) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertTitle>Poz inceleme alanı açılamadı</AlertTitle>
          <AlertDescription>{detay.uyari ?? 'Poz kaydı bulunamadı.'}</AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link href={`/admin/pozlar${queryString ? `?${queryString}` : ''}`}>Pozlara dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <PozReviewWorkspace
      detay={detay.data}
      komsular={komsular.data}
      komsuUyarisi={komsular.uyari}
      birimler={secenekler.birimler}
      queryString={queryString}
    />
  );
}
