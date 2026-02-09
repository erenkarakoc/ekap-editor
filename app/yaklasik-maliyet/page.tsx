'use client';

import { Header } from '@shared/components/header';
import { CostEstimateView } from '@features/cost-estimate/components/cost-estimate-view';

export default function YaklasikMaliyetPage() {
  return (
    <div className="bg-background flex h-screen flex-col">
      <Header title="Yaklaşık Maliyet" />
      <CostEstimateView />
    </div>
  );
}
