'use client';

import { Header } from '@shared/components/header';
import { PriceDiffView } from '@features/price-diff/components/price-diff-view';

export default function FiyatFarkiPage() {
  return (
    <div className="bg-background flex h-screen flex-col">
      <Header title="Fiyat Farkı" />
      <PriceDiffView />
    </div>
  );
}
