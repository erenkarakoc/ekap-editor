'use client';

import { Header } from '@shared/components/header';
import { UnitPriceView } from '@features/unit-price/components/unit-price-view';

export default function BirimFiyatPage() {
  return (
    <div className="bg-background flex h-screen flex-col">
      <Header title="Birim Fiyat Analizi" />
      <UnitPriceView />
    </div>
  );
}
