import type { Metadata } from 'next';

import { TransferRunsView } from '@features/admin/components/transfer-runs-view';
import { aktarimlariGetir } from '@features/admin/lib/admin-data';

export const metadata: Metadata = { title: 'Aktarım Koşuları | Kamu Poz Yönetimi' };

export default async function AktarimlarPage({
  searchParams,
}: {
  searchParams: Promise<{ aktarim?: string }>;
}) {
  const { aktarim } = await searchParams;
  return <TransferRunsView veri={await aktarimlariGetir(aktarim)} />;
}
