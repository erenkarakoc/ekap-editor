import { SourcesView } from '@features/admin/components/sources-view';
import { kaynakOzetiniGetir } from '@features/admin/lib/admin-data';

export default async function KaynaklarPage() {
  const data = await kaynakOzetiniGetir();
  return (
    <SourcesView
      kurumlar={data.kurumlar as unknown as Record<string, unknown>[]}
      yayinlar={data.yayinlar as unknown as Record<string, unknown>[]}
      profiller={data.profiller}
      ozet={data.ozet}
      hata={data.hata}
    />
  );
}
