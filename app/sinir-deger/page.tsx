'use client';

import { Header } from '@shared/components/header';
import { ThresholdView } from '@features/threshold/components/threshold-view';

export default function SinirDegerPage() {
  return (
    <div className="bg-background flex h-screen flex-col">
      <Header title="Sınır Değer" />
      <ThresholdView />
    </div>
  );
}
