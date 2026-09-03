import { PositionsView } from '@features/admin/components/positions-view';
import { pozlariGetir } from '@features/admin/lib/admin-data';

export default async function PozlarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? '';
  return <PositionsView pozlar={await pozlariGetir(q)} initialSearch={q} />;
}
