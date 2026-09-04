'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pause, Play } from 'lucide-react';

import { Button } from '@shared/components/ui/button';

export function VisualAutoRefresh() {
  const router = useRouter();
  const [duraklatildi, setDuraklatildi] = useState(false);

  useEffect(() => {
    if (duraklatildi) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [duraklatildi, router]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-muted-foreground text-xs" aria-live="polite">
        {duraklatildi
          ? 'Canlı sonuç yenilemesi duraklatıldı.'
          : 'Canlı sonuçlar, bu sekme görünürken 15 saniyede bir yenilenir.'}
      </p>
      <Button variant="outline" size="sm" onClick={() => setDuraklatildi((value) => !value)}>
        {duraklatildi ? (
          <Play data-icon="inline-start" aria-hidden="true" />
        ) : (
          <Pause data-icon="inline-start" aria-hidden="true" />
        )}
        {duraklatildi ? 'Canlı yenilemeyi sürdür' : 'Canlı yenilemeyi duraklat'}
      </Button>
    </div>
  );
}
