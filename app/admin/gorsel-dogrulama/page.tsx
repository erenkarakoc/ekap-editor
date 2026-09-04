import type { Metadata } from 'next';

import { VisualReviewView } from '@features/admin/components/visual-review-view';
import { gorselDogrulamaGetir } from '@features/admin/lib/admin-data';

export const metadata: Metadata = { title: 'Görsel Doğrulama | Kamu Poz Yönetimi' };

export default async function GorselDogrulamaPage({
  searchParams,
}: {
  searchParams: Promise<{ aktarim?: string; alan?: string; sayfa?: string }>;
}) {
  const params = await searchParams;
  const sayfa = params.sayfa && /^\d+$/.test(params.sayfa) ? Number(params.sayfa) : undefined;
  const alan = params.alan === 'birim' || params.alan === 'fiyat' ? params.alan : undefined;
  return (
    <VisualReviewView
      veri={await gorselDogrulamaGetir({ aktarimId: params.aktarim, alan, sayfa })}
    />
  );
}
